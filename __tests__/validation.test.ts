import { loginSchema, signupSchema, resetSchema, firstError } from '../lib/validation';

describe('validation schemas', () => {
  test('login : email + password requis', () => {
    expect(loginSchema.safeParse({ email: 'x', password: '123' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.fr', password: '123456' }).success).toBe(true);
  });

  test('signup instructor exige agreement', () => {
    const base = {
      role: 'instructor' as const,
      first_name: 'Sof',
      last_name: 'Bori',
      email: 'a@b.fr',
      password: '123456',
    };
    expect(signupSchema.safeParse(base).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, agreement: '12345' }).success).toBe(true);
  });

  test('signup student n\'exige pas agreement', () => {
    const r = signupSchema.safeParse({
      role: 'student',
      first_name: 'Sof',
      last_name: 'Bori',
      email: 'a@b.fr',
      password: '123456',
    });
    expect(r.success).toBe(true);
  });

  test('reset email valide', () => {
    expect(resetSchema.safeParse({ email: 'pas-un-email' }).success).toBe(false);
    expect(resetSchema.safeParse({ email: 'a@b.fr' }).success).toBe(true);
  });

  test('firstError renvoie le 1er message', () => {
    const r = loginSchema.safeParse({ email: 'x', password: '1' });
    expect(firstError(r)).toBeTruthy();
    expect(firstError(loginSchema.safeParse({ email: 'a@b.fr', password: '123456' }))).toBeNull();
  });
});
