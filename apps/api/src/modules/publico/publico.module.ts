import { Module } from '@nestjs/common';

import { PqrsfModule } from '../pqrsf/pqrsf.module';
import { PublicoController } from './publico.controller';
import { PublicoService } from './publico.service';

@Module({
  imports: [PqrsfModule],
  controllers: [PublicoController],
  providers: [PublicoService],
})
export class PublicoModule {}
