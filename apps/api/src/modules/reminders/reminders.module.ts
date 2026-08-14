import { Module } from '@nestjs/common';

import { ConversationsModule } from '../conversations/conversations.module';
import { RemindersService } from './reminders.service';

@Module({
  imports: [ConversationsModule],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
