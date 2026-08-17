import { Module } from '@nestjs/common';

import { StorageModule } from '../storage/storage.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [StorageModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
