import { UpdateEventUseCase } from './update-event.use-case';
import { EventRepository } from '../../domain/repositories/event.repository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { HttpException, ForbiddenException } from '@nestjs/common';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { UpdateEventDto } from '../dtos/update-event.dto';
import { Event } from '../../domain/entities/event.entity';
import { EventValidationStatus } from '../../domain/enums/event.enum';

describe('UpdateEventUseCase', () => {
  let useCase: UpdateEventUseCase;
  let eventRepo: jest.Mocked<EventRepository>;
  let userRepo: jest.Mocked<UsuarioRepository>;

  const mockEvent = new Event(
    'id-123',
    'Torneo Viejo',
    'Desc',
    EventValidationStatus.torneo,
    '2026-04-15',
    '10:00',
    '12:00',
    'Tienda',
    0,
    10,
    'D&D',
    0,
    0,
    0,
    0,
    'creador-123',
  );

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
    await expect(
      useCase.updateEvent('999', {} as UpdateEventDto, 'user-1'),
    ).rejects.toThrow(HttpException);
  });

  it('debe lanzar ForbiddenException si no es admin ni empleado', async () => {
    eventRepo.findById.mockResolvedValue(mockEvent);
    userRepo.findRolById.mockResolvedValue(RolUsuario.jugador);

    await expect(
      useCase.updateEvent('id-123', {} as UpdateEventDto, 'intruso-456'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe lanzar 400 si el nuevo título ya está en uso por otro evento', async () => {
    eventRepo.findById.mockResolvedValue(mockEvent);
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    // Simulamos que el nombre "Nuevo Titulo" ya lo tiene el evento 'id-999'
    eventRepo.findByName.mockResolvedValue(
      new Event(
        'id-999',
        'Nuevo Titulo',
        undefined,
        EventValidationStatus.torneo,
        '2026-04-15',
        '10:00',
        undefined,
        'Tienda',
        undefined,
        10,
      ),
    );

    await expect(
      useCase.updateEvent(
        'id-123',
        { titulo: 'Nuevo Titulo' } as UpdateEventDto,
        'admin-1',
      ),
    ).rejects.toThrow(HttpException);
  });

  it('debe actualizar correctamente si el usuario es el Creador (empleado)', async () => {
    const updatedEvent = new Event(
      'id-123',
      'Editado',
      'Desc',
      EventValidationStatus.torneo,
      '2026-04-15',
      '10:00',
      '12:00',
      'Tienda',
      0,
      10,
      'D&D',
      0,
      0,
      0,
      0,
      'creador-123',
    );

    eventRepo.findById.mockResolvedValue(mockEvent);
    userRepo.findRolById.mockResolvedValue(RolUsuario.empleado);
    eventRepo.findByName.mockResolvedValue(null);
    eventRepo.update.mockResolvedValue(updatedEvent);

    const result = await useCase.updateEvent(
      'id-123',
      { titulo: 'Editado' } as UpdateEventDto,
      'creador-123',
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(eventRepo.update).toHaveBeenCalled();
    expect(result.titulo).toBe('Editado');
  });

  it('debe lanzar ForbiddenException si empleado intenta actualizar evento de otro', async () => {
    eventRepo.findById.mockResolvedValue(mockEvent); // Creador es 'creador-123'
    userRepo.findRolById.mockResolvedValue(RolUsuario.empleado);

    await expect(
      useCase.updateEvent(
        'id-123',
        { titulo: 'Hack' } as UpdateEventDto,
        'otro-empleado',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe actualizar correctamente si el usuario es Admin', async () => {
    const updatedEvent = new Event(
      'id-123',
      'Torneo Viejo',
      'Desc',
      EventValidationStatus.torneo,
      '2026-04-15',
      '10:00',
      '12:00',
      'Nuevo Lugar',
      0,
      10,
      'D&D',
      0,
      0,
      0,
      0,
      'creador-123',
    );

    eventRepo.findById.mockResolvedValue(mockEvent);
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    eventRepo.update.mockResolvedValue(updatedEvent);

    const result = await useCase.updateEvent(
      'id-123',
      { lugar: 'Nuevo Lugar' } as UpdateEventDto,
      'admin-1',
    );

    expect(result.lugar).toBe('Nuevo Lugar');
  });

  it('debe lanzar 500 si falla la base de datos', async () => {
    eventRepo.findById.mockRejectedValue(new Error('DB Down'));
    await expect(
      useCase.updateEvent('id-123', {} as UpdateEventDto, 'admin-1'),
    ).rejects.toThrow(HttpException);
  });
});
