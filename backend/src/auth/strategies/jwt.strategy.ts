import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { UsuariosService } from '../../usuarios/usuarios.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usuariosService: UsuariosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Consulta la BD en cada petición autenticada (antes esto era una comprobación puramente
  // criptográfica, sin tocar la BD) - es el precio real de que un token sea revocable: sin este
  // lookup, tokenVersion en el payload no serviría de nada, porque nadie lo compararía contra
  // nada. Con una tabla usuarios del tamaño de este proyecto, el coste es insignificante.
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const usuario = await this.usuariosService.findById(payload.sub);
    if (!usuario || usuario.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Sesión inválida o revocada, vuelve a iniciar sesión');
    }
    return payload;
  }
}
