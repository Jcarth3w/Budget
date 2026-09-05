import jwt from 'jsonwebtoken';

const EXPIRES_IN = '1d';

function secret() {
  const value = process.env.JWT_SECRET?.trim();
  if (!value || value.length < 16) {
    throw new Error(
      `JWT_SECRET must be set in Backend/.env (at least 16 characters). Generate one with: node -p "require('crypto').randomBytes(32).toString('hex')"`
    );
  }
  return value;
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    secret(),
    { expiresIn: EXPIRES_IN }
  );
}

export function verifyToken(token) {
  const payload = jwt.verify(token, secret());
  return { id: payload.sub, email: payload.email };
}
