import { Injectable } from '@nestjs/common';

export interface ResultadoFiltro {
  aceptado: boolean;
  motivo?: string;
}

// Bounding box amplio de España peninsular, Baleares y Canarias - una colonia felina real
// gestionada por un ayuntamiento español cae dentro. No es una validación de fronteras exacta
// (sirve solo para cazar coordenadas absurdas: 0,0 por un formulario mal rellenado, o un punto en
// otro continente por un intento de abuso), por eso el margen es generoso a propósito.
const ESPANA_BBOX = { latMin: 27, latMax: 44, lonMin: -19, lonMax: 5 };

const MAX_LONGITUD_TEXTO = 500;
const MAX_APORTACIONES_POR_DIA = 5;

// Etiquetas HTML o el pseudoprotocolo javascript: no tienen ningún motivo legítimo en una
// observación de texto libre - es la señal más barata de un intento de inyección (XSS si ese
// texto se acaba renderizando sin escapar en algún sitio) en vez de una descripción real.
const PATRON_HTML_O_SCRIPT = /<[^>]*>|javascript:/i;
// Nadie describe una colonia de gatos con un enlace - un ayuntamiento revisando aportaciones no
// debería tener que abrir URLs de origen desconocido que llegan de un usuario anónimo sin
// verificar más que su email.
const PATRON_URL = /https?:\/\/|www\./i;
// 10+ repeticiones seguidas del mismo carácter ("aaaaaaaaaa...") es el patrón típico de un
// formulario relleno para pasar validaciones de "no vacío" sin escribir nada de verdad, o de un
// intento automatizado de sondear límites de longitud.
const PATRON_REPETICION_SOSPECHOSA = /(.)\1{9,}/;

@Injectable()
export class AportacionFilterService {
  evaluarTextos(textos: (string | null | undefined)[]): ResultadoFiltro {
    for (const texto of textos) {
      if (!texto) continue;
      if (texto.length > MAX_LONGITUD_TEXTO) {
        return { aceptado: false, motivo: 'Uno de los campos de texto supera la longitud máxima permitida' };
      }
      if (PATRON_HTML_O_SCRIPT.test(texto)) {
        return { aceptado: false, motivo: 'El texto contiene marcado no permitido' };
      }
      if (PATRON_URL.test(texto)) {
        return { aceptado: false, motivo: 'No se permiten enlaces en el texto' };
      }
      if (PATRON_REPETICION_SOSPECHOSA.test(texto)) {
        return { aceptado: false, motivo: 'El texto no parece una descripción real' };
      }
    }
    return { aceptado: true };
  }

  evaluarCoordenadas(latitud: number, longitud: number): ResultadoFiltro {
    if (
      latitud < ESPANA_BBOX.latMin ||
      latitud > ESPANA_BBOX.latMax ||
      longitud < ESPANA_BBOX.lonMin ||
      longitud > ESPANA_BBOX.lonMax
    ) {
      return { aceptado: false, motivo: 'Las coordenadas indicadas quedan fuera del área de servicio' };
    }
    return { aceptado: true };
  }

  evaluarRitmoEnvios(aportacionesUltimas24h: number): ResultadoFiltro {
    if (aportacionesUltimas24h >= MAX_APORTACIONES_POR_DIA) {
      return { aceptado: false, motivo: 'Demasiadas aportaciones enviadas en las últimas 24 horas' };
    }
    return { aceptado: true };
  }
}
