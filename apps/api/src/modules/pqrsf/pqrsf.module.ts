import { Module } from '@nestjs/common';

import { PqrsfController } from './pqrsf.controller';
import { PqrsfService } from './pqrsf.service';

@Module({
  controllers: [PqrsfController],
  providers: [PqrsfService],
  // El sitio público radica por aquí: una PQRSF que entra por la web tiene
  // el mismo plazo legal y el mismo expediente que la que radica el mostrador.
  exports: [PqrsfService],
})
export class PqrsfModule {}
