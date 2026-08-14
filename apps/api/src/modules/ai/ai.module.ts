import { Module } from '@nestjs/common';

import { AppointmentsModule } from '../appointments/appointments.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { AiController } from './ai.controller';
import { AsistenteService } from './asistente.service';

@Module({
  imports: [ConversationsModule, AppointmentsModule],
  controllers: [AiController],
  providers: [AsistenteService],
  exports: [AsistenteService],
})
export class AiModule {}
