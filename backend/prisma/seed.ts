import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPLOADS_DIR } from '../src/uploads/uploaded-file.util.js';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'password123';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_ASSETS_DIR = join(__dirname, 'seed-assets');

/**
 * Copia una foto de demo (ya procesada con el mismo pipeline que /uploads: recorte EXIF,
 * ancho máx. 1600px, WebP q80) a uploads/ con un nombre fijo, y devuelve su URL pública.
 * El nombre es determinista (no un UUID aleatorio) para que reseedear no vaya dejando copias
 * huérfanas cada vez.
 */
async function seedPhotoUrl(assetRelPath: string): Promise<string> {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const filename = `seed-${assetRelPath.replace(/\//g, '-')}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  await copyFile(join(SEED_ASSETS_DIR, assetRelPath), join(UPLOADS_DIR, filename));
  return `${appUrl}/uploads/${filename}`;
}

async function main() {
  // --- Usuarios ---
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@ayto-ejemplo.es' },
    update: {},
    create: {
      email: 'admin@ayto-ejemplo.es',
      passwordHash,
      nombreCompleto: 'María Ruiz',
      rol: 'ADMINISTRADOR',
    },
  });

  const gestor = await prisma.usuario.upsert({
    where: { email: 'gestor@ayto-ejemplo.es' },
    update: {},
    create: {
      email: 'gestor@ayto-ejemplo.es',
      passwordHash,
      nombreCompleto: 'Javier Soler',
      rol: 'GESTOR',
    },
  });

  // --- Fotos de demo ---
  const fotoColoniaAlameda = await seedPhotoUrl('places/colonia-alameda.webp');
  const fotoColoniaPoligono = await seedPhotoUrl('places/colonia-poligono.webp');
  const fotoColoniaOlivar = await seedPhotoUrl('places/colonia-olivar.webp');
  const fotoColoniaEstacion = await seedPhotoUrl('places/colonia-estacion.webp');

  const fotoComederoBanco = await seedPhotoUrl('places/comedero-banco.webp');
  const fotoComederoContenedor = await seedPhotoUrl('places/comedero-contenedor.webp');
  const fotoComederoNaveLateral = await seedPhotoUrl('places/comedero-nave-lateral.webp');
  const fotoComederoOlivo = await seedPhotoUrl('places/comedero-olivo.webp');
  const fotoComederoCaseta = await seedPhotoUrl('places/comedero-caseta.webp');

  const fotoGatoGrisaceo = await seedPhotoUrl('cats/gato-alameda-grisaceo.webp');
  const fotoGatoManchitas = await seedPhotoUrl('cats/gato-alameda-manchitas.webp');
  const fotoGatoNaranja = await seedPhotoUrl('cats/gato-alameda-naranja.webp');
  const fotoGatoIndustrial = await seedPhotoUrl('cats/gato-poligono-industrial.webp');
  const fotoGatoAtigrada = await seedPhotoUrl('cats/gato-poligono-atigrada.webp');
  const fotoGatoAceituna = await seedPhotoUrl('cats/gato-olivar-aceituna.webp');
  const fotoGatoRomero = await seedPhotoUrl('cats/gato-olivar-romero.webp');
  const fotoGatoVia = await seedPhotoUrl('cats/gato-estacion-via.webp');
  const fotoGatoEstrella = await seedPhotoUrl('cats/gato-estacion-estrella.webp');

  // --- Colonias ---
  const datosAlameda = {
    codigoOficial: 'COL-2024-001',
    nombre: 'Parque de la Alameda',
    tipoSuelo: 'URBANO',
    latitud: 40.4234,
    longitud: -3.6987,
    observaciones: 'Colonia estable junto a la zona de juegos infantiles.',
    fotoUrl: fotoColoniaAlameda,
  } as const;
  const alameda = await prisma.colonia.upsert({
    where: { codigoOficial: datosAlameda.codigoOficial },
    update: datosAlameda,
    create: datosAlameda,
  });

  const datosPoligono = {
    codigoOficial: 'COL-2024-002',
    nombre: 'Polígono Industrial Norte',
    tipoSuelo: 'INDUSTRIAL',
    latitud: 40.4482,
    longitud: -3.6721,
    observaciones: 'Acceso restringido; coordinar con seguridad de la nave 12.',
    fotoUrl: fotoColoniaPoligono,
  } as const;
  const poligono = await prisma.colonia.upsert({
    where: { codigoOficial: datosPoligono.codigoOficial },
    update: datosPoligono,
    create: datosPoligono,
  });

  const datosOlivar = {
    codigoOficial: 'COL-2024-003',
    nombre: 'Finca El Olivar',
    tipoSuelo: 'RURAL',
    latitud: 40.3958,
    longitud: -3.7301,
    observaciones: null,
    fotoUrl: fotoColoniaOlivar,
  } as const;
  const olivar = await prisma.colonia.upsert({
    where: { codigoOficial: datosOlivar.codigoOficial },
    update: datosOlivar,
    create: datosOlivar,
  });

  const datosEstacion = {
    codigoOficial: 'COL-2024-004',
    nombre: 'Barrio de la Estación',
    tipoSuelo: 'URBANO',
    latitud: 40.4103,
    longitud: -3.6845,
    observaciones: 'Colonia de reciente creación, en fase de censo inicial.',
    fotoUrl: fotoColoniaEstacion,
  } as const;
  const estacion = await prisma.colonia.upsert({
    where: { codigoOficial: datosEstacion.codigoOficial },
    update: datosEstacion,
    create: datosEstacion,
  });

  // --- Comederos ---
  for (const data of [
    {
      coloniaId: alameda.id,
      ubicacionDetallada: 'Junto al banco verde, entrada norte',
      fotoUrl: fotoComederoBanco,
    },
    {
      coloniaId: alameda.id,
      ubicacionDetallada: 'Detrás del contenedor de vidrio',
      fotoUrl: fotoComederoContenedor,
    },
    {
      coloniaId: poligono.id,
      ubicacionDetallada: 'Lateral de la nave 12, zona de carga',
      fotoUrl: fotoComederoNaveLateral,
    },
    {
      coloniaId: olivar.id,
      ubicacionDetallada: 'Bajo el olivo grande, junto al muro',
      fotoUrl: fotoComederoOlivo,
    },
    {
      coloniaId: olivar.id,
      ubicacionDetallada: 'Caseta de aperos, lado este',
      fotoUrl: fotoComederoCaseta,
    },
    {
      coloniaId: estacion.id,
      ubicacionDetallada: 'Solar junto a las vías, acceso por Calle Sur',
      fotoUrl: fotoColoniaEstacion,
    },
  ]) {
    const existente = await prisma.comedero.findFirst({
      where: { coloniaId: data.coloniaId, ubicacionDetallada: data.ubicacionDetallada },
    });
    if (existente) {
      await prisma.comedero.update({ where: { id: existente.id }, data });
    } else {
      await prisma.comedero.create({ data });
    }
  }

  // --- Gatos ---
  for (const data of [
      {
        coloniaId: alameda.id,
        nombre: 'Grisáceo',
        sexo: 'MACHO',
        capaPelaje: 'Gris atigrado',
        estadoCer: 'ESTERILIZADO',
        tieneMicrochip: true,
        numMicrochip: '941000012345678',
        marcajeOreja: true,
        fotoUrl: fotoGatoGrisaceo,
      },
      {
        coloniaId: alameda.id,
        nombre: 'Manchitas',
        sexo: 'HEMBRA',
        capaPelaje: 'Blanco y negro',
        estadoCer: 'ESTERILIZADO',
        tieneMicrochip: false,
        marcajeOreja: true,
        fotoUrl: fotoGatoManchitas,
      },
      {
        coloniaId: alameda.id,
        nombre: null,
        sexo: 'DESCONOCIDO',
        capaPelaje: 'Naranja',
        estadoCer: 'AVISTADO',
        tieneMicrochip: false,
        marcajeOreja: false,
        fotoUrl: fotoGatoNaranja,
      },
      {
        coloniaId: poligono.id,
        nombre: 'Industrial',
        sexo: 'MACHO',
        capaPelaje: 'Negro',
        estadoCer: 'CAPTURADO',
        tieneMicrochip: false,
        marcajeOreja: false,
        fotoUrl: fotoGatoIndustrial,
      },
      {
        coloniaId: poligono.id,
        nombre: null,
        sexo: 'HEMBRA',
        capaPelaje: 'Atigrado marrón',
        estadoCer: 'AVISTADO',
        tieneMicrochip: false,
        marcajeOreja: false,
        fotoUrl: fotoGatoAtigrada,
      },
      {
        coloniaId: olivar.id,
        nombre: 'Aceituna',
        sexo: 'HEMBRA',
        capaPelaje: 'Gris oscuro',
        estadoCer: 'ESTERILIZADO',
        tieneMicrochip: true,
        numMicrochip: '941000098765432',
        marcajeOreja: true,
        fotoUrl: fotoGatoAceituna,
      },
      {
        coloniaId: olivar.id,
        nombre: 'Romero',
        sexo: 'MACHO',
        capaPelaje: 'Blanco',
        estadoCer: 'RETORNADO',
        tieneMicrochip: true,
        numMicrochip: '941000011122233',
        marcajeOreja: true,
        fotoUrl: fotoGatoRomero,
      },
      {
        coloniaId: estacion.id,
        nombre: 'Vía',
        sexo: 'MACHO',
        capaPelaje: 'Atigrado gris',
        estadoCer: 'AVISTADO',
        tieneMicrochip: false,
        marcajeOreja: false,
        fotoUrl: fotoGatoVia,
      },
      {
        coloniaId: estacion.id,
        nombre: 'Estrella',
        sexo: 'HEMBRA',
        capaPelaje: 'Tricolor',
        estadoCer: 'ADOPTADO',
        tieneMicrochip: true,
        numMicrochip: '941000055566677',
        marcajeOreja: false,
        fotoUrl: fotoGatoEstrella,
      },
    ] as const) {
    const existente = await prisma.gato.findFirst({
      where: { coloniaId: data.coloniaId, nombre: data.nombre },
    });
    if (existente) {
      await prisma.gato.update({ where: { id: existente.id }, data: data as never });
    } else {
      await prisma.gato.create({ data: data as never });
    }
  }

  // --- Voluntarios ---
  const ana = await prisma.voluntario.upsert({
    where: { dni: '11111111H' },
    update: {},
    create: {
      dni: '11111111H',
      nombre: 'Ana Torres',
      telefono: '600111222',
      urlCesionDatos: 'https://example.com/cesiones/ana-torres.pdf',
    },
  });

  const luis = await prisma.voluntario.upsert({
    where: { dni: '22222222J' },
    update: {},
    create: {
      dni: '22222222J',
      nombre: 'Luis Fernández',
      telefono: '600333444',
      urlCesionDatos: 'https://example.com/cesiones/luis-fernandez.pdf',
    },
  });

  const carmen = await prisma.voluntario.upsert({
    where: { dni: '33333333K' },
    update: {},
    create: {
      dni: '33333333K',
      nombre: 'Carmen Vidal',
      telefono: null,
      urlCesionDatos: 'https://example.com/cesiones/carmen-vidal.pdf',
    },
  });

  // --- Asignaciones ---
  await Promise.all(
    [
      {
        voluntarioId: ana.id,
        coloniaId: alameda.id,
        rolAsignado: 'Alimentador principal',
      },
      {
        voluntarioId: ana.id,
        coloniaId: estacion.id,
        rolAsignado: 'Supervisor',
      },
      {
        voluntarioId: luis.id,
        coloniaId: poligono.id,
        rolAsignado: 'Capturador',
      },
      {
        voluntarioId: carmen.id,
        coloniaId: olivar.id,
        rolAsignado: 'Alimentador principal',
      },
      {
        voluntarioId: carmen.id,
        coloniaId: alameda.id,
        rolAsignado: 'Supervisor',
      },
      {
        voluntarioId: carmen.id,
        coloniaId: poligono.id,
        rolAsignado: 'Veterinaria',
      },
    ].map(({ voluntarioId, coloniaId, rolAsignado }) =>
      prisma.asignacionVoluntario.upsert({
        where: { voluntarioId_coloniaId: { voluntarioId, coloniaId } },
        update: {},
        create: { voluntarioId, coloniaId, rolAsignado },
      }),
    ),
  );

  console.log('Datos de prueba creados.');
  console.log(`  Administrador: ${admin.email} / ${DEMO_PASSWORD}`);
  console.log(`  Gestor:        ${gestor.email} / ${DEMO_PASSWORD}`);
  console.log('  4 colonias, 6 comederos, 9 gatos, 3 voluntarios, 6 asignaciones, con fotos.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
