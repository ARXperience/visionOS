import type { User } from '@prisma/client';
import type { Request } from 'express';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
declare const LocalStrategy_base: new (...args: any[]) => Strategy;
export declare class LocalStrategy extends LocalStrategy_base {
    private readonly auth;
    constructor(auth: AuthService);
    validate(req: Request, email: string, password: string): Promise<User>;
}
export {};
