import { Module } from '@nestjs/common';

import { TimelineModule } from '../timeline/timeline.module';
import { SurgeriesController } from './surgeries.controller';
import { SurgeriesService } from './surgeries.service';

@Module({
  imports: [TimelineModule],
  controllers: [SurgeriesController],
  providers: [SurgeriesService],
})
export class SurgeriesModule {}
