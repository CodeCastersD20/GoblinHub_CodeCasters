import { Request } from 'express';

export interface SupabaseUser {
  id: string;
  aud: string;
  role: string;
  email?: string;
  email_confirmed_at?: string;
  phone?: string;
  phone_confirmed_at?: string;
  last_sign_in_at?: string;
  app_metadata: {
    provider?: string;
    providers?: string[];
    [key: string]: any;
  };
  user_metadata: {
    [key: string]: any;
  };
  identities?: any[];
  created_at: string;
  updated_at: string;
}

export interface AuthenticatedRequest extends Request {
  user?: SupabaseUser;
  headers: Request['headers'] & {
    authorization?: string;
  };
}
