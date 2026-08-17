import type { User } from '@prisma/client';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    private ctx;
    private opcionesCookie;
    private responder;
    login(_dto: LoginDto, user: User, req: Request, res: Response): Promise<{
        accessToken: string;
        expiresIn: number;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").UserRole;
            permissions: string[];
            siteIds: string[];
            primarySiteId: string | null;
        };
    }>;
    refresh(req: Request, res: Response): Promise<{
        accessToken: string;
        expiresIn: number;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").UserRole;
            permissions: string[];
            siteIds: string[];
            primarySiteId: string | null;
        };
    }>;
    yo(user: User): {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.UserRole;
        permissions: ("user.read" | "user.manage" | "site.read" | "site.manage" | "service.read" | "service.manage" | "audit.read" | "settings.manage" | "patient.read" | "patient.write" | "patient.read_cross_site" | "patient.merge" | "patient.export" | "appointment.read" | "appointment.write" | "appointment.cancel" | "appointment.overbook" | "appointment.checkin" | "schedule.manage" | "waitlist.manage" | "conversation.read" | "conversation.write" | "conversation.assign" | "whatsapp.manage" | "lead.read" | "lead.write" | "ai.toggle" | "ai.configure" | "dashboard.read" | "dashboard.read_all_sites")[];
    };
    logout(userId: string, res: Response): Promise<void>;
}
