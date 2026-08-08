const baseUrl = process.env.NOTWHAT_API_BASE_URL || 'http://127.0.0.1:5001/api';

function parseArgs(argv) {
    const args = {
        expectImmediateResend: false,
        strictResend: false,
        resendWaitMs: null,
        otp: process.env.SIGNUP_OTP_TEST_CODE || '',
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--expect-immediate-resend') {
            args.expectImmediateResend = true;
            continue;
        }
        if (arg === '--strict-resend') {
            args.strictResend = true;
            continue;
        }
        if (arg === '--resend-wait-ms') {
            args.resendWaitMs = Number(argv[i + 1] || 0);
            i += 1;
            continue;
        }
        if (arg === '--otp') {
            args.otp = String(argv[i + 1] || '');
            i += 1;
        }
    }

    return args;
}

async function request(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch (_error) {
        payload = null;
    }

    return {
        ok: response.ok && payload?.success !== false,
        status: response.status,
        payload,
    };
}

function phase(status, name, detail = '') {
    const suffix = detail ? ` | ${detail}` : '';
    console.log(`${status} | ${name}${suffix}`);
}

function nowStamp() {
    return Date.now().toString(36);
}

function buildBuyerPayload(stamp) {
    return {
        name: 'Buyer Smoke',
        email: `buyer.signup.${stamp}@example.com`,
        password: 'Password123!',
        phone: '9999999999',
        address: 'Jaipur Rajasthan',
    };
}

function buildSellerPayload(stamp) {
    return {
        name: 'Seller Smoke',
        email: `seller.signup.${stamp}@example.com`,
        password: 'Password123!',
        phone: '9876543210',
        storeName: 'Smoke Store',
        storeCategory: 'Streetwear',
        locality: 'Andheri West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400053',
        country: 'India',
        specialtyRegion: 'Mumbai Streetwear',
        storeDescription: 'Smoke seller flow',
    };
}

async function verifyIfPossible(labelPrefix, verificationId, otp, errors) {
    if (!verificationId) {
        errors.push(`${labelPrefix}: verify skipped due to missing verification id`);
        return;
    }

    if (!otp) {
        phase('INFO', `${labelPrefix} Verify`, 'skipped (provide --otp or SIGNUP_OTP_TEST_CODE)');
        return;
    }

    const verify = await request('/auth/signup/verify-email', {
        method: 'POST',
        body: {
            verificationId,
            otp,
        },
    });

    const token = verify.payload?.data?.token;
    if (verify.ok && token) {
        phase('PASS', `${labelPrefix} Verify`);
    } else {
        phase('FAIL', `${labelPrefix} Verify`, `status=${verify.status} message=${verify.payload?.message || 'unknown'}`);
        errors.push(`${labelPrefix}: verify failed`);
    }
}

async function runResendChecks(labelPrefix, verificationId, options, errors) {
    if (!verificationId) {
        errors.push(`${labelPrefix}: resend skipped due to missing verification id`);
        return;
    }

    if (options.expectImmediateResend) {
        const resend = await request('/auth/signup/resend-code', {
            method: 'POST',
            body: { verificationId },
        });

        if (resend.ok) {
            phase('PASS', `${labelPrefix} Resend Immediate`);
        } else {
            phase('FAIL', `${labelPrefix} Resend Immediate`, `status=${resend.status} message=${resend.payload?.message || 'unknown'}`);
            errors.push(`${labelPrefix}: immediate resend did not pass`);
        }
        return;
    }

    if (!options.strictResend) {
        const resend = await request('/auth/signup/resend-code', {
            method: 'POST',
            body: { verificationId },
        });

        if (resend.ok) {
            phase('PASS', `${labelPrefix} Resend`);
        } else {
            phase('INFO', `${labelPrefix} Resend`, `status=${resend.status} message=${resend.payload?.message || 'unknown'}`);
        }
        return;
    }

    const earlyResend = await request('/auth/signup/resend-code', {
        method: 'POST',
        body: { verificationId },
    });

    if (!earlyResend.ok && earlyResend.status === 429) {
        phase('PASS', `${labelPrefix} Resend Cooldown Guard`, '429 before cooldown window ends');
    } else {
        phase('FAIL', `${labelPrefix} Resend Cooldown Guard`, `expected 429, got status=${earlyResend.status}`);
        errors.push(`${labelPrefix}: cooldown guard did not trigger`);
    }

    const resendWaitMs = Number.isFinite(options.resendWaitMs) && options.resendWaitMs > 0
        ? options.resendWaitMs
        : 65_000;

    phase('INFO', `${labelPrefix} Resend Wait`, `${resendWaitMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, resendWaitMs));

    const lateResend = await request('/auth/signup/resend-code', {
        method: 'POST',
        body: { verificationId },
    });

    if (lateResend.ok) {
        phase('PASS', `${labelPrefix} Resend After Cooldown`);
    } else {
        phase('FAIL', `${labelPrefix} Resend After Cooldown`, `status=${lateResend.status} message=${lateResend.payload?.message || 'unknown'}`);
        errors.push(`${labelPrefix}: resend after cooldown failed`);
    }
}

async function runSignupFlow(labelPrefix, payload, options, errors) {
    const startPath = labelPrefix === 'Buyer' ? '/auth/signup/buyer/start' : '/auth/signup/seller/start';
    const start = await request(startPath, {
        method: 'POST',
        body: payload,
    });

    const verificationId = start.payload?.data?.verificationId || '';
    if (start.ok && verificationId) {
        phase('PASS', `${labelPrefix} Start`, `verificationId=${verificationId}`);
    } else {
        phase('FAIL', `${labelPrefix} Start`, `status=${start.status} message=${start.payload?.message || 'unknown'}`);
        errors.push(`${labelPrefix}: start failed`);
        return;
    }

    await runResendChecks(labelPrefix, verificationId, options, errors);
    await verifyIfPossible(labelPrefix, verificationId, options.otp, errors);
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const errors = [];

    console.log('=== Signup Smoke Phase Report ===');
    console.log(`INFO | Base URL | ${baseUrl}`);

    const health = await request('/health');
    if (health.ok) {
        phase('PASS', 'Phase 0 Health');
    } else {
        phase('FAIL', 'Phase 0 Health', `status=${health.status} message=${health.payload?.message || 'unknown'}`);
        process.exit(1);
    }

    const stamp = nowStamp();
    await runSignupFlow('Buyer', buildBuyerPayload(stamp), options, errors);
    await runSignupFlow('Seller', buildSellerPayload(stamp), options, errors);

    if (errors.length > 0) {
        console.log('=== Result: FAIL ===');
        errors.forEach((entry) => console.log(`ERROR | ${entry}`));
        process.exit(1);
    }

    console.log('=== Result: PASS ===');
}

main().catch((error) => {
    console.error(`FAIL | Script Crash | ${error.message}`);
    process.exit(1);
});
