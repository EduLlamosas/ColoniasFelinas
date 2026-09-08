import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { handlePrismaError } from './prisma-error.util.js';

function makePrismaError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('mensaje interno de prisma', {
    code,
    clientVersion: '6.19.3',
    meta,
  });
}

describe('handlePrismaError', () => {
  it('traduce P2002 (clave duplicada) a ConflictException citando el campo afectado', () => {
    const error = makePrismaError('P2002', { target: ['email'] });
    expect(() => handlePrismaError(error)).toThrow(ConflictException);
    expect(() => handlePrismaError(error)).toThrow(/email/);
  });

  it('traduce P2002 sin meta.target a ConflictException genérico', () => {
    const error = makePrismaError('P2002');
    expect(() => handlePrismaError(error)).toThrow(ConflictException);
  });

  it('P2002 traduce el nombre de columna real (snake_case) a una etiqueta en español, sin filtrarlo', () => {
    const error = makePrismaError('P2002', { target: ['num_microchip'] });
    expect(() => handlePrismaError(error)).toThrow(/número de microchip/);
    try {
      handlePrismaError(error);
    } catch (e) {
      expect((e as ConflictException).message).not.toMatch(/num_microchip/);
    }
  });

  it('P2002 sobre una clave compuesta traduce cada columna del target', () => {
    const error = makePrismaError('P2002', { target: ['voluntario_id', 'colonia_id'] });
    expect(() => handlePrismaError(error)).toThrow(/voluntario, colonia/);
  });

  it('P2002 sobre una columna sin etiqueta mapeada cae de vuelta al nombre de columna tal cual', () => {
    const error = makePrismaError('P2002', { target: ['columna_futura_sin_mapear'] });
    expect(() => handlePrismaError(error)).toThrow(/columna_futura_sin_mapear/);
  });

  it('traduce P2003 (FK inválida o restringida) a BadRequestException', () => {
    const error = makePrismaError('P2003');
    expect(() => handlePrismaError(error)).toThrow(BadRequestException);
  });

  it('traduce P2025 (registro no encontrado) a NotFoundException', () => {
    const error = makePrismaError('P2025');
    expect(() => handlePrismaError(error)).toThrow(NotFoundException);
  });

  it('relanza un PrismaClientKnownRequestError con código no mapeado tal cual', () => {
    const error = makePrismaError('P9999');
    expect(() => handlePrismaError(error)).toThrow(error);
  });

  it('relanza cualquier error que no sea de Prisma tal cual', () => {
    const error = new Error('fallo inesperado');
    expect(() => handlePrismaError(error)).toThrow(error);
  });
});
