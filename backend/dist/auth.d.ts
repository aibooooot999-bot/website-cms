import { Request, Response, NextFunction } from 'express';
export interface JwtPayload {
    userId: string;
    username: string;
    roleId: string;
}
export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        display_name: string;
        email: string;
        role_id: string;
        role_name: string;
        permissions: string[];
    };
}
export declare function generateToken(payload: JwtPayload): string;
export declare function verifyToken(token: string): JwtPayload | null;
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function requirePermission(...requiredPermissions: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare function getAllPermissions(): {
    id: string;
    name: string;
    category: string;
}[];
