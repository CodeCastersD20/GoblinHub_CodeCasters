import { softDeletedEventUseCase } from './sd-event.use-case';
import { EventRepository } from '../../domain/repositories/event.repository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { HttpException, ForbiddenException } from '@nestjs/common';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';

describe('softDeletedEventUseCase', () => {
  let useCase: softDeletedEventUseCase;
  let eventRepo: jest.Mocked<EventRepository>;
  let userRepo: jest.Mocked<UsuarioRepository>;

  const mockEvent = {
    id: 'id-123',
    id_evento: 'evento-123',
    titulo: 'Torneo D&D',
    descripcion: 'Descripción del evento',
    tipo_evento: 'torneo',
    fecha: new Date(),
    id_creador: 'creador-123',
    activa: true,
  } as any;

  beforeEach(() => {
    // 1. Mockeamos el repositorio de eventos
    eventRepo = {
      findById: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<EventRepository>;

    // 2. Mockeamos el repositorio de usuarios
    userRepo = {
      findRolById: jest.fn(),
    } as unknown as jest.Mocked<UsuarioRepository>;

    // 3. Le pasamos ambos al Use Case
    useCase = new softDeletedEventUseCase(eventRepo, userRepo);
  });

  it('debe lanzar HttpException 404 si el evento no existe', async () => {
    eventRepo.findById.mockResolvedValue(null);
    
    await expect(useCase.softDeleteEvent('evento-999', 'user-1')).rejects.toThrow(HttpException);
  });

  it('debe lanzar ForbiddenException si no es admin ni el creador', async () => {
    eventRepo.findById.mockResolvedValue(mockEvent); // Creador es 'creador-123'
    userRepo.findRolById.mockResolvedValue('otro_rol' as any); // No es admin
    
    // Intentamos borrar con un usuario que NO es el creador ('user-intruso')
    await expect(useCase.softDeleteEvent('evento-123', 'user-intruso')).rejects.toThrow(ForbiddenException);
  });

  it('debe permitir borrar si el usuario es el creador (aunque no sea admin)', async () => {
    eventRepo.findById.mockResolvedValue(mockEvent); // Creador es 'creador-123'
    userRepo.findRolById.mockResolvedValue('otro_rol' as any); // No es admin
    eventRepo.delete.mockResolvedValue({ ...mockEvent, activa: false } as any);

    const result = await useCase.softDeleteEvent('evento-123', 'creador-123'); // Mismo ID que el creador

    expect(eventRepo.delete).toHaveBeenCalledWith('evento-123');
    expect((result as any).activa).toBe(false);
  });

  it('debe permitir borrar si el usuario es Admin (aunque no sea el creador)', async () => {
    eventRepo.findById.mockResolvedValue(mockEvent); // Creador es 'creador-123'
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin); // ES ADMIN
    eventRepo.delete.mockResolvedValue({ ...mockEvent, activa: false } as any);

    // Intentamos borrar con un usuario diferente ('admin-1')
    const result = await useCase.softDeleteEvent('evento-123', 'admin-1');

    expect(eventRepo.delete).toHaveBeenCalledWith('evento-123');
    expect((result as any).activa).toBe(false);
  });

  it('debe lanzar HttpException 500 si la base de datos falla', async () => {
    eventRepo.findById.mockRejectedValue(new Error('Error de conexión DB'));

    await expect(useCase.softDeleteEvent('evento-123', 'user-1')).rejects.toThrow(HttpException);
  });
});