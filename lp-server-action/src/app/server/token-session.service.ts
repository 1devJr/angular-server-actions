import { randomBytes } from 'crypto';

export class TokenSessionService {
  private sessionTokens = new Map<string, number>(); // token => expiresAt

  createToken(): string {
    const token = randomBytes(32).toString('hex');
    const expires = Date.now() + 5 * 60 * 1000;
    this.sessionTokens.set(token, expires);
    return token;
  }

  validate(token: string | undefined): boolean {
    if (!token) return false;
    const expires = this.sessionTokens.get(token);
    if (!expires || expires < Date.now()) {
      this.sessionTokens.delete(token);
      return false;
    }
    return true;
  }
}

export const tokenSessionService = new TokenSessionService();
