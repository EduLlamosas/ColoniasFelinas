import { AportacionFilterService } from './aportacion-filter.service.js';

describe('AportacionFilterService', () => {
  let filter: AportacionFilterService;

  beforeEach(() => {
    filter = new AportacionFilterService();
  });

  describe('evaluarTextos', () => {
    it('acepta texto normal', () => {
      expect(filter.evaluarTextos(['Colonia junto al parque', null, undefined])).toEqual({
        aceptado: true,
      });
    });

    it('rechaza texto con etiquetas HTML', () => {
      expect(filter.evaluarTextos(['<script>alert(1)</script>'])).toMatchObject({ aceptado: false });
    });

    it('rechaza texto con el pseudoprotocolo javascript:', () => {
      expect(filter.evaluarTextos(['javascript:alert(1)'])).toMatchObject({ aceptado: false });
    });

    it('rechaza texto con enlaces', () => {
      expect(filter.evaluarTextos(['visita https://ejemplo.com'])).toMatchObject({ aceptado: false });
      expect(filter.evaluarTextos(['www.ejemplo.com'])).toMatchObject({ aceptado: false });
    });

    it('rechaza texto con repetición sospechosa de caracteres', () => {
      expect(filter.evaluarTextos(['aaaaaaaaaaaaaaaa'])).toMatchObject({ aceptado: false });
    });

    it('rechaza texto que supera la longitud máxima', () => {
      expect(filter.evaluarTextos(['a'.repeat(501)])).toMatchObject({ aceptado: false });
    });

    it('acepta texto justo en el límite de longitud', () => {
      const texto = 'Colonia numerosa junto al polideportivo, '.repeat(15).slice(0, 500);
      expect(texto).toHaveLength(500);
      expect(filter.evaluarTextos([texto])).toEqual({ aceptado: true });
    });
  });

  describe('evaluarCoordenadas', () => {
    it('acepta coordenadas dentro de España', () => {
      // Madrid
      expect(filter.evaluarCoordenadas(40.4168, -3.7038)).toEqual({ aceptado: true });
    });

    it('rechaza coordenadas 0,0 (fuera del bounding box)', () => {
      expect(filter.evaluarCoordenadas(0, 0)).toMatchObject({ aceptado: false });
    });

    it('rechaza coordenadas de otro continente', () => {
      // Nueva York
      expect(filter.evaluarCoordenadas(40.7128, -74.006)).toMatchObject({ aceptado: false });
    });
  });

  describe('evaluarRitmoEnvios', () => {
    it('acepta por debajo del máximo diario', () => {
      expect(filter.evaluarRitmoEnvios(4)).toEqual({ aceptado: true });
    });

    it('rechaza al alcanzar el máximo diario', () => {
      expect(filter.evaluarRitmoEnvios(5)).toMatchObject({ aceptado: false });
    });
  });
});
