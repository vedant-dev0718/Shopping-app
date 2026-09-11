# NotWhat API — EC2 deployment

Single `t3.small` running the Express API under systemd, behind nginx with a
Let's Encrypt certificate. Config lives in SSM Parameter Store; no secrets on
disk in git, no static AWS keys on the instance.

| File | Purpose |
|---|---|
| `push-ssm.sh` | Upload `backend/.env` into Parameter Store (run once, from your Mac) |
| `iam-instance-policy.json` | Inline policy for the EC2 instance role |
| `bootstrap.sh` | One-time instance setup |
| `render-env.sh` | Renders `.env` from Parameter Store on every service start |
| `notwhat-api.service` | systemd unit |
| `nginx.conf` | Reverse proxy config |
| `deploy.sh` | Redeploy with health check and auto-rollback |

## Constraints worth knowing

**The instance must live in AZ `use2-az2`.** `AWS_S3_BUCKET` is an S3 Express
One Zone directory bucket pinned to that zone. AZ *IDs* map to different AZ
*names* per account, so look yours up rather than assuming `us-east-2b`.

**Run exactly one instance.** `src/app.js` schedules three jobs with
`setInterval` inside the web process. A second instance runs every job twice,
including `runEarningsEligibility`, which releases seller payouts. Add a
Mongo-based job lock before scaling out.

---

## Step 1 — Local prep

```bash
brew install awscli && aws configure          # region: us-east-2
aws sts get-caller-identity

# AZ name for the S3 Express zone — note the output
aws ec2 describe-availability-zones --region us-east-2 \
  --query "AvailabilityZones[?ZoneId=='use2-az2'].ZoneName" --output text
```

Create a **MongoDB Atlas** M10 in `us-east-2`, add a DB user, and copy the
`mongodb+srv://` string. Leave the IP allow-list empty until step 3.

## Step 2 — Config into Parameter Store

```bash
./deploy/push-ssm.sh
```

Skips the two AWS keys (the instance role replaces them) and the two OTP test
codes (`SIGNUP_OTP_TEST_CODE`, `PASSWORD_RESET_OTP_TEST_CODE` would let anyone
sign in with a fixed code). Then apply the production overrides the script
prints — `MONGO_URI`, `NODE_ENV`, `PORT`, `API_PUBLIC_BASE_URL`, `CLIENT_URLS`.

Verify:

```bash
aws ssm get-parameters-by-path --region us-east-2 --path /notwhat/prod/ \
  --recursive --query 'length(Parameters)'
```

## Step 3 — AWS resources

1. IAM role `NotWhatBackendInstanceRole`, trusted by `ec2.amazonaws.com`:
   attach the managed policy `AmazonSSMManagedInstanceCore`, plus
   `iam-instance-policy.json` inline (replace `ACCOUNT_ID` and
   `MEDIACONVERT_ROLE_NAME`).
2. Launch EC2: Amazon Linux 2023, `t3.small` (`t3.large` if you keep local
   ffmpeg transcoding), **subnet in the AZ from step 1**, the IAM role above,
   30 GB gp3.
3. Security group: inbound `80` and `443` from anywhere. **No port 22** — use
   Session Manager. Never expose 5001.
4. Allocate an Elastic IP, associate it, add it to the Atlas allow-list.
5. DNS `A` record: `api.yourdomain.com` → Elastic IP. Confirm with
   `dig +short api.yourdomain.com` before step 5 or certbot will fail.

## Step 4 — Instance setup

```bash
aws ssm start-session --target i-xxxxxxxx --region us-east-2

sudo dnf install -y git
sudo bash /tmp/bootstrap.sh     # or clone the repo first and run deploy/bootstrap.sh
```

It installs Node 22, ffmpeg, the `notwhat` service user, 2 GB of swap, prints a
deploy key to add to GitHub, clones, installs, and starts the service. It exits
non-zero if `/api/health` doesn't come up.

## Step 5 — TLS

```bash
sudo cp /opt/notwhat/app/deploy/nginx.conf /etc/nginx/conf.d/notwhat.conf
sudo vi /etc/nginx/conf.d/notwhat.conf        # set your real server_name
sudo systemctl enable --now nginx && sudo nginx -t && sudo systemctl reload nginx

sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## Step 6 — Seed and verify

```bash
cd /opt/notwhat/app/backend
sudo -u notwhat npm run seed:admin
npm run smoke:signup-flows
npm run smoke:payment-shipping
```

From your Mac: `curl https://api.yourdomain.com/api/health`

## Step 7 — Cutover

1. Repoint the Razorpay and Shiprocket webhooks to
   `https://api.yourdomain.com/webhooks/razorpay` and `/webhooks/shiprocket`.
   Fire a test event from each dashboard, confirm 200 in
   `journalctl -u notwhat-api -f`. These are raw-body signature-verified, so a
   wrong URL fails silently from the client side.
2. Update the iOS build config and `web/storefront` to the new base URL.
3. Verify a real signup, video upload, and checkout.

---

## Redeploys

```bash
sudo /opt/notwhat/deploy.sh            # or: sudo /opt/notwhat/deploy.sh some-branch
```

Pulls, reinstalls, restarts, polls health for 30s, and rolls back to the
previous commit if it doesn't come up. Brief connection drop on restart.

Config-only change? Update the parameter and `sudo systemctl restart
notwhat-api` — `render-env.sh` re-renders `.env` on every start.

## Operations

```bash
journalctl -u notwhat-api -f            # logs
systemctl status notwhat-api
sudo -u notwhat /opt/notwhat/render-env.sh && sudo systemctl restart notwhat-api
```

Startup failures are usually `src/config/env.js` throwing on a missing
`MONGO_URI`, `JWT_SECRET`, or `CLIENT_URL`.

## Known issue to test early

`src/utils/ffmpegHLS.js:18-19` builds playback URLs as
`https://<bucket>.s3.<region>.amazonaws.com/<key>` — the *standard* bucket
format. Directory buckets serve from `s3express-use2-az2.us-east-2.amazonaws.com`,
which is what `AWS_S3_ENDPOINT` is set to, but that endpoint isn't used by this
URL builder. If uploaded videos 404 on playback, that's the cause.
