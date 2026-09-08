const jwt = require('jsonwebtoken');
const nock = require('nock');

const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller, createAdmin, password } = require('../helpers/auth.helper');
const { buyerSignupPayload, sellerSignupPayload } = require('../helpers/mockData.helper');
const PendingSignup = require('../../src/modules/auth/pendingSignup.model');
const PasswordResetOtp = require('../../src/modules/auth/passwordResetOtp.model');
const TokenBlacklist = require('../../src/modules/auth/tokenBlacklist.model');
const User = require('../../src/modules/users/user.model');

const mockResend = () => nock('https://api.resend.com')
  .post('/emails')
  .reply(200, { id: 'email_mock_signup' });

describe('auth API', () => {
  test('buyer and seller signup require email OTP before account creation', async () => {
    const buyerPayload = buyerSignupPayload({ email: 'buyer-auth@example.com' });
    const sellerPayload = sellerSignupPayload({ email: 'seller-auth@example.com' });

    await api().post('/api/auth/signup/buyer').send(buyerPayload).expect(400);

    mockResend();
    const buyerStart = await api().post('/api/auth/signup/buyer/start').send(buyerPayload).expect(200);
    expect(buyerStart.body.data.verificationId).toBeTruthy();
    expect(await User.findOne({ email: buyerPayload.email })).toBeNull();
    expect(await PendingSignup.findOne({ email: buyerPayload.email })).toBeTruthy();

    await api()
      .post('/api/auth/signup/verify-email')
      .send({ verificationId: buyerStart.body.data.verificationId, otp: '000000' })
      .expect(400);

    const buyer = await api()
      .post('/api/auth/signup/verify-email')
      .send({ verificationId: buyerStart.body.data.verificationId, otp: '123456' })
      .expect(201);
    expect(buyer.body.data.user.role).toBe('buyer');
    expect(buyer.body.data.user.isEmailVerified).toBe(true);
    expect(buyer.body.data.token).toBeTruthy();

    mockResend();
    const sellerStart = await api().post('/api/auth/signup/seller/start').send(sellerPayload).expect(200);
    const seller = await api()
      .post('/api/auth/signup/verify-email')
      .send({ verificationId: sellerStart.body.data.verificationId, otp: '123456' })
      .expect(201);
    expect(seller.body.data.user.role).toBe('seller');
    expect(seller.body.data.user.isEmailVerified).toBe(true);

    await api().post('/api/auth/signup/buyer/start').send(buyerPayload).expect(409);
    await api().post('/api/auth/signup/buyer/start').send({ ...buyerPayload, email: 'not-email' }).expect(400);
    await api().post('/api/auth/signup/buyer/start').send({ ...buyerPayload, email: 'weak@example.com', password: 'weak' }).expect(400);
  });

  test('signup verification code can be resent with rate limits and creates one account', async () => {
    const buyerPayload = buyerSignupPayload({ email: 'buyer-resend@example.com' });

    mockResend();
    const start = await api().post('/api/auth/signup/buyer/start').send(buyerPayload).expect(200);

    mockResend();
    await api()
      .post('/api/auth/signup/resend-code')
      .send({ verificationId: start.body.data.verificationId })
      .expect(200);

    await api()
      .post('/api/auth/signup/verify-email')
      .send({ verificationId: start.body.data.verificationId, otp: '123456' })
      .expect(201);

    await api()
      .post('/api/auth/signup/verify-email')
      .send({ verificationId: start.body.data.verificationId, otp: '123456' })
      .expect(400);

    expect(await User.countDocuments({ email: buyerPayload.email })).toBe(1);
  });

  test('login, me, invalid token, and logout responses work', async () => {
    const buyer = await createBuyer({ email: 'buyer-login@example.com', phone: '9876543210', password });

    const login = await api()
      .post('/api/auth/login')
      .send({ email: buyer.email, password })
      .expect(200);

    expect(login.body.data.user.email).toBe(buyer.email);

    // Test phone login directly
    const phoneLogin = await api()
      .post('/api/auth/login')
      .send({ identifier: '9876543210', password })
      .expect(200);
    expect(phoneLogin.body.data.user.email).toBe(buyer.email);

    // Test phone login with +91 format
    const phoneLoginCountryCode = await api()
      .post('/api/auth/login')
      .send({ phone: '+919876543210', password })
      .expect(200);
    expect(phoneLoginCountryCode.body.data.user.email).toBe(buyer.email);

    await api().get('/api/auth/me').expect(401);
    await api().get('/api/auth/me').set('Authorization', `Bearer ${login.body.data.token}`).expect(200);
    await api().get('/api/auth/me').set('Authorization', 'Bearer invalid-token').expect(401);
    await api().post('/api/auth/login').send({ email: buyer.email, password: 'Wrong1!' }).expect(401);
    await api().post('/api/auth/logout').expect(401);
    await api().post('/api/auth/logout').set('Authorization', `Bearer ${login.body.data.token}`).expect(200);
    await api().get('/api/auth/me').set('Authorization', `Bearer ${login.body.data.token}`).expect(401);
  });

  test('forgot password verifies email OTP, resets password, and invalidates existing sessions', async () => {
    const buyer = await createBuyer({ email: 'buyer-reset@example.com', password });
    const login = await api()
      .post('/api/auth/login')
      .send({ email: buyer.email, password })
      .expect(200);

    await api()
      .post('/api/auth/forgot-password')
      .send({ email: buyer.email })
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toContain('reset code');
        expect(res.body.data.email).toBe(buyer.email);
        expect(res.body.data.expiresAt).toBeTruthy();
      });

    const storedOtp = await PasswordResetOtp.findOne({ email: buyer.email }).select('+otpHash').lean();
    expect(storedOtp).toBeTruthy();
    expect(storedOtp.otpHash).not.toBe('654321');

    await api()
      .post('/api/auth/verify-reset-otp')
      .send({ email: buyer.email, otp: '000000' })
      .expect(400);

    const verified = await api()
      .post('/api/auth/verify-reset-otp')
      .send({ email: buyer.email, otp: '654321' })
      .expect(200);
    expect(verified.body.data.resetToken).toBeTruthy();
    expect(verified.body.data.expiresInSeconds).toBe(900);

    await api()
      .post('/api/auth/reset-password')
      .send({ resetToken: verified.body.data.resetToken, newPassword: 'NewPassword1!' })
      .expect(200);

    await api().get('/api/auth/me').set('Authorization', `Bearer ${login.body.data.token}`).expect(401);
    await api().post('/api/auth/login').send({ email: buyer.email, password }).expect(401);
    await api().post('/api/auth/login').send({ email: buyer.email, password: 'NewPassword1!' }).expect(200);
    await api()
      .post('/api/auth/reset-password')
      .send({ resetToken: verified.body.data.resetToken, newPassword: 'AnotherPassword1!' })
      .expect(401);

    const updatedUser = await User.findById(buyer._id).select('+passwordHash authInvalidatedAt').lean();
    expect(updatedUser.authInvalidatedAt).toBeTruthy();
    expect(updatedUser.passwordHash).not.toBe(buyer.passwordHash);
    expect(await TokenBlacklist.exists({ userId: buyer._id })).toBeTruthy();
  });

  test('forgot password send endpoint is limited to three sends per hour per email', async () => {
    const buyer = await createBuyer({ email: 'buyer-reset-limit@example.com', password });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await api()
        .post('/api/auth/forgot-password')
        .send({ email: buyer.email })
        .expect(200);
    }

    await api()
      .post('/api/auth/forgot-password')
      .send({ email: buyer.email })
      .expect(429);
  });

  test('verify-reset-otp endpoint is rate-limited after repeated invalid attempts', async () => {
    const email = 'buyer-verify-reset-limit@example.com';

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await api()
        .post('/api/auth/verify-reset-otp')
        .send({ email, otp: 'abc123' })
        .expect(400);
    }

    const limited = await api()
      .post('/api/auth/verify-reset-otp')
      .send({ email, otp: 'abc123' })
      .expect(429);

    expect(limited.body.success).toBe(false);
    expect(limited.body.message).toContain('Too many reset code verification attempts');
  });

  test('authenticated users can change password and Google-only accounts are blocked', async () => {
    const buyer = await createBuyer({ email: 'buyer-change-password@example.com', password });
    const login = await api()
      .post('/api/auth/login')
      .send({ email: buyer.email, password })
      .expect(200);

    await api()
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ currentPassword: 'WrongPassword1!', newPassword: 'ChangedPassword1' })
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toContain('Current password is incorrect');
      });

    await api()
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ currentPassword: password, newPassword: 'ChangedPassword1' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.passwordChanged).toBe(true);
      });

    await api().get('/api/auth/me').set('Authorization', `Bearer ${login.body.data.token}`).expect(401);
    await api().post('/api/auth/login').send({ email: buyer.email, password }).expect(401);
    await api().post('/api/auth/login').send({ email: buyer.email, password: 'ChangedPassword1' }).expect(200);
    expect(await TokenBlacklist.exists({ userId: buyer._id })).toBeTruthy();

    const googleOnlyUser = await User.create({
      name: 'Google Only',
      email: 'google-only-change@example.com',
      role: 'buyer',
      googleId: 'google-only-change-id',
      signupProvider: 'google',
      authProviders: [{
        provider: 'google',
        providerUserId: 'google-only-change-id',
        email: 'google-only-change@example.com'
      }]
    });

    await api()
      .post('/api/auth/change-password')
      .set('Authorization', authHeader(googleOnlyUser))
      .send({ currentPassword: 'Anything1', newPassword: 'ChangedPassword1' })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('Google sign-in');
      });
  });

  test('login locks an account after five failed password attempts', async () => {
    const buyer = await createBuyer({ email: 'buyer-lockout@example.com', password });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await api()
        .post('/api/auth/login')
        .send({ email: buyer.email, password: `Wrong${attempt}!` })
        .expect(401);
    }

    const locked = await api()
      .post('/api/auth/login')
      .send({ email: buyer.email, password })
      .expect(429);

    expect(locked.body.message).toContain('Too many failed login attempts');

    const persisted = await User.findById(buyer._id).select('+failedLoginAttempts +loginLockedUntil').lean();
    expect(persisted.failedLoginAttempts).toBe(5);
    expect(persisted.loginLockedUntil).toBeTruthy();
  });

  test('login rejects Mongo operator injection payloads', async () => {
    const buyer = await createBuyer({ email: 'buyer-nosql@example.com', password });

    await api()
      .post('/api/auth/login')
      .send({ email: buyer.email, password: { $gt: '' } })
      .expect(400);

    const persisted = await User.findById(buyer._id).select('+failedLoginAttempts +loginLockedUntil').lean();
    expect(persisted.failedLoginAttempts).toBe(0);
    expect(persisted.loginLockedUntil).toBeNull();
  });

  test('expired token and role-protected route access are rejected', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const admin = await createAdmin();
    const expiredToken = jwt.sign({ id: buyer._id.toString(), role: 'buyer' }, process.env.JWT_SECRET, { expiresIn: '-1s' });

    await api().get('/api/auth/me').set('Authorization', `Bearer ${expiredToken}`).expect(401);
    await api().get('/api/seller/orders').set('Authorization', authHeader(buyer)).expect(403);
    await api().get('/api/cart').set('Authorization', authHeader(seller)).expect(403);
    await api().get('/api/admin/analytics/platform').set('Authorization', authHeader(seller)).expect(403);
    await api().get('/api/admin/analytics/platform').set('Authorization', authHeader(admin)).expect(200);
  });
});
