/**
 * Unit tests for the auth middleware (verifyToken / verifySuperuser).
 * Pure logic — no DB or server required.
 */
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
const { verifyToken, verifySuperuser } = require('../middleware/auth');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

describe('verifyToken', () => {
  test('rejects request with no Authorization header (403)', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    verifyToken(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects an invalid/tampered token (401)', () => {
    const req = { headers: { authorization: 'Bearer not-a-real-token' } };
    const res = mockRes();
    const next = jest.fn();
    verifyToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts a valid token and attaches req.user', () => {
    const token = jwt.sign({ id: 1, role: 'superuser' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();
    verifyToken(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.id).toBe(1);
    expect(req.user.role).toBe('superuser');
  });
});

describe('verifySuperuser', () => {
  test.each(['superuser', 'admin', 'ADMIN', 'Superuser'])(
    'allows role "%s"',
    (role) => {
      const req = { user: { role } };
      const res = mockRes();
      const next = jest.fn();
      verifySuperuser(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBeNull();
    }
  );

  test.each(['customer', '', undefined, 'guest'])(
    'blocks non-admin role "%s" (403)',
    (role) => {
      const req = { user: { role } };
      const res = mockRes();
      const next = jest.fn();
      verifySuperuser(req, res, next);
      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    }
  );
});
