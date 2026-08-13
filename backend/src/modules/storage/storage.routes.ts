import { Router } from 'express';
import { storageController } from './storage.controller';

export const storageRouter = Router();

// Streams private objects using backend-generated tokens.
// Token is verified server-side and does not expose provider credentials.
storageRouter.get('/private/:token', (req, res, next) => storageController.streamPrivateObject(req, res, next));

