export interface LoginRequest {
  email: string;
  password: string;
  turnstileToken?: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  name?: string;
  phone?: string;
  turnstileToken?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: number;
  email: string;
  username: string;
  roles: string[];
  planSlug: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  user: import('./user').User;
  tokens: AuthTokens;
}
