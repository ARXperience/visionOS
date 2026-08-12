import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { User } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (campo: keyof User | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user as User | undefined;
    return campo ? user?.[campo] : user;
  },
);
