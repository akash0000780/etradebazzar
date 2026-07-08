import jwt, { SignOptions, VerifyOptions, Algorithm } from "jsonwebtoken";
import crypto from "crypto";

import { config } from "../../config/config";

const PRIVATE_KEY = config.jwtPrivateKey;
const PUBLIC_KEY = config.jwtPublicKey;
const FALLBACK_SECRET = config.jwtSecret;

if (!PRIVATE_KEY || !PUBLIC_KEY) {
  if (!FALLBACK_SECRET || FALLBACK_SECRET.length < 32) {
    throw new Error(
      "JWT config error: Provide jwtPrivateKey + jwtPublicKey (RS256) OR a strong jwtSecret (≥32 chars)"
    );
  }
  console.warn("JWT: No RSA keys → using HS256 fallback (not ideal for production)");
}

const ALGORITHM: Algorithm = PRIVATE_KEY && PUBLIC_KEY ? "RS256" : "HS256";

interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

class JwtService {
  private sign(payload: any, expiresIn: string, includeJti = false): string {
    const options: SignOptions = {
      algorithm: ALGORITHM,
      expiresIn: expiresIn as SignOptions["expiresIn"],
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    };

    if (includeJti) {
      payload.jti = crypto.randomUUID();
    }

    const key = ALGORITHM === "RS256" ? PRIVATE_KEY : FALLBACK_SECRET;

    return jwt.sign(payload, key!, options);
  }

  private verify<T extends object = JwtPayload>(token: string): T & { jti?: string } {
    const options: VerifyOptions = {
      algorithms: [ALGORITHM],
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    };

    const key = ALGORITHM === "RS256" ? PUBLIC_KEY : FALLBACK_SECRET;

    try {
      return jwt.verify(token, key!, options) as T & { jti?: string };
    } catch (err: any) {
      if (err.name === "TokenExpiredError") throw new Error("Token expired");
      if (err.name === "JsonWebTokenError") throw new Error("Invalid token");
      throw new Error("Token verification failed");
    }
  }

  signTokens(payload: JwtPayload): Tokens {
    return {
      accessToken: this.sign({ ...payload }, config.accessTokenExpiresIn),
      refreshToken: this.sign({ ...payload, type: "refresh" }, config.refreshTokenExpiresIn, true),
    };
  }
  refreshToken(oldRefreshToken: string): Tokens {
    const payload = this.verify<JwtPayload & { jti: string }>(oldRefreshToken);

    if (!payload.jti) {
      throw new Error("Invalid refresh token – missing jti");
    }
    return this.signTokens({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    });
  }

  verifyToken<T extends object = JwtPayload>(token: string) {
    return this.verify<T>(token);
  }
}

export const jwtService = new JwtService();

export const signTokens = jwtService.signTokens.bind(jwtService);
export const refreshToken = jwtService.refreshToken.bind(jwtService);
export const verifyToken = jwtService.verifyToken.bind(jwtService);