import { Module } from '@nestjs/common';

import { PqrsfController } from './pqrsf.controller';
import { PqrsfService } from './pqrsf.service';

@Module({
  controllers: [PqrsfController],
  providers: [PqrsfService],
})
export class PqrsfModule {}
