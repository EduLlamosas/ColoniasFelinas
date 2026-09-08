import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// error.meta.target de un P2002 trae el nombre de columna tal cual lo ve Postgres (snake_case,
// con @map aplicado) - un detalle interno del esquema que no pinta nada en un mensaje de cara al
// usuario. Este mapeo cubre todas las columnas @unique/@@id del esquema; una columna nueva que se
// quede sin entrada aquí simplemente sale tal cual (fallback más abajo), no rompe nada.
const UNIQUE_COLUMN_LABELS: Record<string, string> = {
  email: 'email',
  codigo_oficial: 'código oficial',
  num_microchip: 'número de microchip',
  dni: 'DNI',
  voluntario_id: 'voluntario',
  colonia_id: 'colonia',
};

export function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[] | undefined)
        ?.map((columna) => UNIQUE_COLUMN_LABELS[columna] ?? columna)
        .join(', ');
      throw new ConflictException(
        `Ya existe un registro con ese valor${target ? ` (${target})` : ''}`,
      );
    }
    if (error.code === 'P2003') {
      throw new BadRequestException(
        'Operación rechazada por una restricción de clave foránea: o la referencia indicada no existe, o el registro todavía tiene otros registros dependientes',
      );
    }
    if (error.code === 'P2025') {
      throw new NotFoundException('Registro no encontrado');
    }
  }
  throw error;
}
