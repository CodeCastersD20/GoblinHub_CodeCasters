import { Global, Module } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Global()
@Module({
  providers: [
    {
      provide: 'SUPABASE_CLIENT',
      useFactory: (): SupabaseClient => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error(
            'Supabase URL and Key must be set in environment variables',
          );
        }

        return new SupabaseClient(supabaseUrl, supabaseKey);
      },
    },
    {
      provide: 'SUPABASE_ADMIN_CLIENT',
      useFactory: () => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
          throw new Error(
            'Supabase URL and Service Role Key must be set in environment variables',
          );
        }

        return createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
      },
    },
  ],
  exports: ['SUPABASE_CLIENT', 'SUPABASE_ADMIN_CLIENT'],
})
export class SupabaseModule {}
