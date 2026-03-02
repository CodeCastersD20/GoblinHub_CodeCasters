import { UpdateEventUseCase } from './update-event.use-case';
import { EventRepository } from '../../domain/repositories/event.repository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { HttpException, ForbiddenException } from '@nestjs/common';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { UpdateEventDto } from '../../aplication/dtos/update-event.dto';

describe('UpdateEventUseCase', () => {
  let useCase: UpdateEventUseCase;
  let eventRepo: jest.Mocked<EventRepository>;
  let userRepo: jest.Mocked<UsuarioRepository>;

  const mockEvent = {
    id: 'id-123',
    titulo: 'Torneo Viejo',
    id_creador: 'creador-123',
    descripcion: 'Desc',
    tipo_evento: 'torneo',
    fecha: new Date(),
    hora_inicio: '10:00',
    hora_fin: '12:00',
    lugar: 'Tienda',
    costo: 0,
    cupo_maximo: 10,
    sistema_juego: 'D&D',
    puntos_premio_1: 0,
    puntos_premio_2: 0,
    puntos_premio_3: 0,
    puntos_participacion: 0
  } as any;

  beforeEach(() => {
    eventRepo = {
      findById: jest.fn(),
      findByName: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<EventRepository>;

    userRepo = {
      findRolById: jest.fn(),
    } as unknown as jest.Mocked<UsuarioRepository>;

    useCase = new UpdateEventUseCase(eventRepo, userRepo);
  });

  it('debe lanzar 404 si el evento no existe', async () => {
    eventRepo.findById.mockResolvedValue(null);
    await expect(useCase.updateEvent('999', {} as any, 'user-1')).rejects.toThrow(HttpException);
  });

  it('debe lanzar ForbiddenException si no es admin ni el creador', async () => {
    eventRepo.findById.mockResolvedValue(mockEvent);
    userRepo.findRolById.mockResolvedValue('user' as any);
    
    await expect(useCase.updateEvent('id-123', {} as any, 'intruso-456')).rejects.toThrow(ForbiddenException);
  });

  it('debe lanzar 400 si el nuevo título ya está en uso por otro evento', async () => {
    eventRepo.findById.mockResolvedValue(mockEvent);
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    // Simulamos que el nombre "Nuevo Titulo" ya lo tiene el evento 'id-999'
    eventRepo.findByName.mockResolvedValue({ id: 'id-999', titulo: 'Nuevo Titulo' } as any);

    await expect(useCase.updateEvent('id-123', { titulo: 'Nuevo Titulo' } as UpdateEventDto, 'admin-1')).rejects.toThrow(HttpException);
  });

  it('debe actualizar correctamente si el usuario es el Creador', async () => {
    eventRepo.findById.mockResolvedValue(mockEvent);
    userRepo.findRolById.mockResolvedValue('user' as any);
    eventRepo.findByName.mockResolvedValue(null);
    eventRepo.update.mockResolvedValue({ ...mockEvent, titulo: 'Editado' } as any);

    const result = await useCase.updateEvent('id-123', { titulo: 'Editado' } as UpdateEventDto, 'creador-123');

    expect(eventRepo.update).toHaveBeenCalled();
    expect(result.titulo).toBe('Editado');
  });

  it('debe actualizar correctamente si el usuario es Admin', async () => {
    eventRepo.findById.mockResolvedValue(mockEvent);
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    eventRepo.update.mockResolvedValue({ ...mockEvent, lugar: 'Nuevo Lugar' } as any);

    const result = await useCase.updateEvent('id-123', { lugar: 'Nuevo Lugar' } as UpdateEventDto, 'admin-1');

    expect(result.lugar).toBe('Nuevo Lugar');
  });

  it('debe lanzar 500 si falla la base de datos', async () => {
    eventRepo.findById.mockRejectedValue(new Error('DB Down'));
    await expect(useCase.updateEvent('id-123', {} as any, 'admin-1')).rejects.toThrow(HttpException);
  });
});