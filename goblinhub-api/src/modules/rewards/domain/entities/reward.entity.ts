import { TipoRecompensa } from '../enums/reward.enum';

export class Recompensa {
  constructor(
    public id: string,
    public nombre: string,
    public descripcion: string,
    public costo_puntos: number,
    public tipo: TipoRecompensa,
    public valor_descuento?: number,
    public activa: boolean = true, // Por defecto es activa
  ) {}
}