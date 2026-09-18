const bcrypt = require('bcrypt');

const connectDB = require('../src/config/db');
const env = require('../src/config/env');
const User = require('../src/modules/users/user.model');
const { generateTotpSecret, otpauthUrl } = require('../src/utils/totp');

const SALT_ROUNDS = 12;

const run = async () => {
  await connectDB();

  const email = env.adminEmail.trim().toLowerCase();
  const existing = await User.findOne({ email }).select('+passwordHash +adminTotpSecret');
  const totpSecret = env.adminTotpSecret || existing?.adminTotpSecret || generateTotpSecret();

  if (!env.adminPassword) {
    throw new Error('ADMIN_PASSWORD is required to seed or update the admin account');
  }

  if (existing) {
    existing.role = 'admin';
    existing.isAdmin = true;
    existing.accountStatus = existing.accountStatus === 'deleted' ? 'active' : existing.accountStatus;
    existing.adminPermissions = existing.adminPermissions?.length ? existing.adminPermissions : ['*'];
    existing.adminTotpSecret = totpSecret;
    existing.adminTotpEnabled = true;
    existing.adminTotpConfiguredAt = existing.adminTotpConfiguredAt || new Date();

    if (env.adminOverwritePassword) {
      existing.passwordHash = await bcrypt.hash(env.adminPassword, SALT_ROUNDS);
    }

    await existing.save();
    console.log(`Admin user ready: ${email}${env.adminOverwritePassword ? ' (password overwritten)' : ''}`);
    console.log(`Admin TOTP secret: ${totpSecret}`);
    console.log(`Admin TOTP setup URL: ${otpauthUrl({ secret: totpSecret, label: email })}`);
    return;
  }

  const passwordHash = await bcrypt.hash(env.adminPassword, SALT_ROUNDS);

  await User.create({
    name: env.adminName,
    email,
    passwordHash,
    role: 'admin',
    isAdmin: true,
    adminTotpEnabled: true,
    adminTotpSecret: totpSecret,
    adminTotpConfiguredAt: new Date(),
    adminPermissions: ['*'],
    accountStatus: 'active'
  });

  console.log(`Admin user created: ${email}`);
  console.log(`Admin TOTP secret: ${totpSecret}`);
  console.log(`Admin TOTP setup URL: ${otpauthUrl({ secret: totpSecret, label: email })}`);
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Admin seed failed:', error.message);
    process.exit(1);
  });
