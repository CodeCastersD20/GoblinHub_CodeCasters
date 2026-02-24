import { User } from '@supabase/supabase-js';

export interface ValidationResult {
  success: boolean;
  user: User;
  message: string;
}
