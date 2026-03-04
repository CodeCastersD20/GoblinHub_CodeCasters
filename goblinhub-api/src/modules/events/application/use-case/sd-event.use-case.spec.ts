import { SoftDeleteEventUseCase } from './sd-event.use-case';
import { EventRepository } from '../../domain/repositories/event.repository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { HttpException, ForbiddenException } from '@nestjs/common';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { Event } from '../../domain/entities/event.entity';
import { EventValidationStatus } from '../../domain/enums/event.enum';

describe('SoftDeleteEventUseCase', () => {
  let useCase: SoftDeleteEventUseCase;
  let eventRepo: jest.Mocked<EventRepository>;
  let userRepo: jest.Mocked<UsuarioRepository>;

  const mockEvent = new Event(
    'evento-123',
    'Torneo D&D',
    'Descripción del evento',
    EventValidationStatus.torneo,
    '2026-04-15',
    '10:00',
    undefined,
    'Tienda',
    undefined,
    20,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    'creador-123',
  );

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
    useCase = new SoftDeleteEventUseCase(eventRepo, userRepo);
  });

  it('debe lanzar HttpException 404 si el evento no existe', async () => {
    eventRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.softDeleteEvent('evento-999', 'user-1'),
    ).rejects.toThrow(HttpException);
  });

  it('debe lanzar ForbiddenException si no es admin ni el creador', async () => {
    eventRepo.findById.mockResolvedValue(mockEvent); // Creador es 'creador-123'
    userRepo.findRolById.mockResolvedValue(null); // No es admin

    // Intentamos borrar con un usuario que NO es el creador ('user-intruso')
    await expect(
      useCase.softDeleteEvent('evento-123', 'user-intruso'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe permitir borrar si el usuario es el creador (aunque no sea admin)', async () => {
    eventRepo.findById.mockResolvedValue(mockEvent); // Creador es 'creador-123'
    userRepo.findRolById.mockResolvedValue(null); // No es admin
    eventRepo.delete.mockResolvedValue(mockEvent);

    const result = await useCase.softDeleteEvent('evento-123', 'creador-123'); // Mismo ID que el creador

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(eventRepo.delete).toHaveBeenCalledWith('evento-123');
    expect(result).toEqual(mockEvent);
  });

  it('debe permitir borrar si el usuario es Admin (aunque no sea el creador)', async () => {
    eventRepo.findById.mockResolvedValue(mockEvent); // Creador es 'creador-123'
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin); // ES ADMIN
    eventRepo.delete.mockResolvedValue(mockEvent);

    // Intentamos borrar con un usuario diferente ('admin-1')
    const result = await useCase.softDeleteEvent('evento-123', 'admin-1');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(eventRepo.delete).toHaveBeenCalledWith('evento-123');
    expect(result).toEqual(mockEvent);
  });

  it('debe lanzar HttpException 500 si la base de datos falla', async () => {
    eventRepo.findById.mockRejectedValue(new Error('Error de conexión DB'));

    await expect(
      useCase.softDeleteEvent('evento-123', 'user-1'),
    ).rejects.toThrow(HttpException);
  });
});
