import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Trackea por usuario autenticado (req.user.sub, ya rellenado por JwtAuthGuard antes de que este
// guard se ejecute - ver el orden en @UseGuards de UploadsController), no por IP: varios
// gestores subiendo fotos desde la misma oficina/NAT no deben compartir cupo, y una cuenta que
// abuse desde IPs distintas no debe poder esquivarlo cambiando de red.
@Injectable()
export class UploadsThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?.sub;
    return userId ? `user-${userId}` : req.ip;
  }
}
