import { Request, Response } from 'express';
import { accountService } from '../services/AccountService';

export class AccountController {

    async createAccount(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = (req as any).userId;
            const { accountName, initialCapital, broker } = req.body;

            const account = await accountService.createAccount(userId, accountName, initialCapital, broker);
            res.status(201).json(account);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    async getAccounts(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = (req as any).userId;
            const accounts = await accountService.getUserAccounts(userId);
            res.json(accounts);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAccountById(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = (req as any).userId;
            const accountId = req.params.id;
            const account = await accountService.getAccount(accountId, userId);
            res.json(account);
        } catch (error: any) {
            res.status(404).json({ message: error.message });
        }
    }
}

export const accountController = new AccountController();
