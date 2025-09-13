import { User, UserSubscription } from './user.types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      subscription?: UserSubscription;
    }
  }
}

export {};