export interface PrestamoUpdate {  
  pre_id: number;  
  pre_fin?: string;  
  usr_cedula: number;  
  est_id?: number;  
  ele_id: number;  
  ele_cantidad: number;  
  pre_ele_cantidad_prestado?: number; // Hacerla opcional
}