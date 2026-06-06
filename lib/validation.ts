import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court (min. 6 car.)'),
});

export const signupSchema = z
  .object({
    role: z.enum(['student', 'instructor']),
    first_name: z.string().min(2, 'Prénom requis'),
    last_name: z.string().min(2, 'Nom requis'),
    email: z.string().email('Email invalide'),
    password: z.string().min(6, 'Mot de passe trop court (min. 6 car.)'),
    agreement: z.string().optional(),
    referral: z.string().optional(),
  })
  .refine(
    (v) => v.role !== 'instructor' || (v.agreement && v.agreement.trim().length >= 4),
    { path: ['agreement'], message: 'N° d\'agrément requis (min. 4 car.)' }
  );

export const resetSchema = z.object({
  email: z.string().email('Email invalide'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

// Type local indépendant de la version de zod (SafeParseReturnType a été
// retiré en zod v4). On ne dépend que des champs qu'on lit réellement.
type SafeParseLike =
  | { success: true }
  | { success: false; error: { issues: { message: string }[] } };

export function firstError(result: SafeParseLike): string | null {
  if (result.success) return null;
  const first = result.error.issues[0];
  return first?.message ?? 'Champs invalides';
}
