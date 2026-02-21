import { EventValidationStatus } from '../enums/event.enum';

export class Event {
  constructor(
    public id: number,
    public titulo: string,
    public descripcion: string | undefined,
    public tipo_evento: EventValidationStatus,
    public fecha: string,
    public hora_inicio: string,
    public hora_fin: string | undefined,
    public lugar: string,
    public costo: number | undefined,
    public cupo_maximo: number,
    public sistema_juego?: string,
    public puntos_premio_1?: number,
    public puntos_premio_2?: number,
    public puntos_premio_3?: number,
    public puntos_participacion?: number,
  ) {}
}
