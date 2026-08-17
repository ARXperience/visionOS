import { Module } from '@nestjs/common';

import { TimelineModule } from '../timeline/timeline.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [TimelineModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
