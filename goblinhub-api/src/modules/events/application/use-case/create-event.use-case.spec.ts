import { CreateEventUseCase } from './create-event.use-case';
import { EventRepository } from '../../domain/repositories/event.repository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { HttpException, ForbiddenException } from '@nestjs/common';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { EventValidationStatus } from '../../domain/enums/event.enum';

describe('CreateEventUseCase', () => {
  let useCase: CreateEventUseCase;
  let eventRepo: jest.Mocked<EventRepository>;
  let userRepo: jest.Mocked<UsuarioRepository>;

  // Truco maestro: Obtenemos el primer valor válido de tu Enum automáticamente 
  // para que la validación de "includes" pase sin importar cómo se llame el valor real.
  const validStatus = Object.values(EventValidationStatus);

const mockDto = {
    titulo: 'Torneo Épico',
    descripcion: 'Un torneo muy épico',
    // Bórrale el Object.values() y ponle el string directo, así:
    tipo_evento: 'torneo' as any, 
    fecha: new Date(),
    hora_inicio: '10:00',
    hora_fin: '18:00',
    lugar: 'Tienda',
    costo: 100,
    cupo_maximo: 20,
    sistema_juego: 'D&D',
    puntos_premio_1: 50,
    puntos_premio_2: 30,
    puntos_premio_3: 10,
    puntos_participacion: 5,
  } as any;

  beforeEach(() => {
    eventRepo = {
      findByName: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<EventRepository>;

    userRepo = {
      findRolById: jest.fn(),
    } as unknown as jest.Mocked<UsuarioRepository>;

    useCase = new CreateEventUseCase(eventRepo, userRepo);
  });

  it('debe lanzar ForbiddenException si el usuario no es admin ni empleado', async () => {
    userRepo.findRolById.mockResolvedValue('cliente' as any); // Rol no permitido

    await expect(useCase.createEvent(mockDto, 'user-123')).rejects.toThrow(ForbiddenException);
  });

  it('debe lanzar HttpException 400 si el evento ya existe', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    // Simulamos que el repositorio encontró un evento con ese título
    eventRepo.findByName.mockResolvedValue({ id_evento: '1', titulo: 'Torneo Épico' } as any);

    await expect(useCase.createEvent(mockDto, 'admin-123')).rejects.toThrow(HttpException);
  });

  it('debe lanzar HttpException 400 si el status de validación es inválido', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    eventRepo.findByName.mockResolvedValue(null); // No existe
    
    // Le mandamos un status que no existe en tu Enum
    const invalidDto = { ...mockDto, tipo_evento: 'STATUS_INVENTADO' };

    await expect(useCase.createEvent(invalidDto, 'admin-123')).rejects.toThrow(HttpException);
  });

  it('debe crear el evento exitosamente si es ADMIN y los datos son correctos', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    eventRepo.findByName.mockResolvedValue(null);
    eventRepo.create.mockResolvedValue({ ...mockDto, id: 'nuevo-123' } as any);

    const result = await useCase.createEvent(mockDto, 'admin-123');

    expect(eventRepo.create).toHaveBeenCalled();
    expect(result.id).toBe('nuevo-123');
  });

  it('debe crear el evento exitosamente si es EMPLEADO', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.empleado);
    eventRepo.findByName.mockResolvedValue(null);
    eventRepo.create.mockResolvedValue({ ...mockDto, id_evento: 'nuevo-123' } as any);

    await useCase.createEvent(mockDto, 'emp-123');

    expect(eventRepo.create).toHaveBeenCalled();
  });

  it('debe lanzar HttpException 500 si hay un error no controlado en BD', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    // Simulamos que se cae la base de datos
    eventRepo.findByName.mockRejectedValue(new Error('Fallo catastrófico en la BD'));

    await expect(useCase.createEvent(mockDto, 'admin-123')).rejects.toThrow(HttpException);
  });
});