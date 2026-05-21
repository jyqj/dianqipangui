import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const DEFAULT_JWT_SECRET = "upper-computer-dev-secret-change-me";
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  console.warn("[Auth] 未设置 JWT_SECRET，生产环境请立即配置强随机密钥。");
}

export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function verifyPasswordSync(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES || "24h") as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(
  token: string
): Record<string, unknown> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
  } catch {
    return null;
  }
}
