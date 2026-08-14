import { Global, Module } from '@nestjs/common';

import { TimelineService } from './timeline.service';

/**
 * Global porque casi todo módulo que escribe algo del paciente tiene que
 * proyectarlo, y pasarlo por el árbol de imports lo convertiría en una
 * dependencia que se olvida.
 */
@Global()
@Module({
  providers: [TimelineService],
  exports: [TimelineService],
})
export class TimelineModule {}
