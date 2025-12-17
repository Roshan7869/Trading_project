import { Request, Response } from 'express';
import { authService } from '../services/AuthService';

export class AuthController {

    async register(req: Request, res: Response) {
        try {
            const { user, token } = await authService.register(req.body);
            res.status(201).json({ user, token });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            const { user, token } = await authService.login(email, password);
            res.json({ user, token });
        } catch (error: any) {
            res.status(401).json({ message: error.message });
        }
    }

    async getProfile(req: Request, res: Response) {
        try {
            // @ts-ignore - user attached by middleware
            const userId = req.user.id;
            const user = await authService.getProfile(userId);
            res.json(user);
        } catch (error: any) {
            res.status(404).json({ message: error.message });
        }
    }
}

export const authController = new AuthController();
