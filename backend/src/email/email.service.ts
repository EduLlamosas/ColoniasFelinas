// Token de inyección, mismo patrón que STORAGE_SERVICE (storage/storage.service.ts): qué
// implementación hay detrás (SMTP real en producción, solo log en consola en desarrollo sin
// credenciales) es una decisión de arranque, no algo que los servicios que mandan correos deban
// conocer.
export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');

export interface EmailService {
  enviar(destinatario: string, asunto: string, textoPlano: string): Promise<void>;
}
