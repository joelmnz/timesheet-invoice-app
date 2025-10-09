import { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    authenticated?: boolean;
    username?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session.authenticated) {
    return next();
  }
  
  res.status(401).json({ error: 'Unauthorized' });
}
