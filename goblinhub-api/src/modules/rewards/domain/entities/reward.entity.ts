import { TipoRecompensa } from '../enums/reward.enum';

export class Recompensa {
  constructor(
    public id: number,
    public nombre: string,
    public descripcion: string | undefined,
    public costo_puntos: number,
    public tipo: TipoRecompensa,
    public valor_descuento?: number,
    public activa: boolean = true, // Por defecto es activa
    public id_creador?: string,
  ) {}
}
