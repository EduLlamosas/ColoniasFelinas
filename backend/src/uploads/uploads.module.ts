import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UploadsController } from './uploads.controller.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [UploadsController],
})
export class UploadsModule {}
