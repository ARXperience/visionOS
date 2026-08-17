import { Module } from '@nestjs/common';

import { InventoryModule } from '../inventory/inventory.module';
import { TimelineModule } from '../timeline/timeline.module';
import { OpticsController } from './optics.controller';
import { OpticsService } from './optics.service';

@Module({
  imports: [InventoryModule, TimelineModule],
  controllers: [OpticsController],
  providers: [OpticsService],
})
export class OpticsModule {}
