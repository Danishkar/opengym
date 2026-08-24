# Deploying openGym on Railway 🚀

This guide explains how to deploy openGym to **Railway** in just a few clicks.

## 1. Create a New Service on Railway

1. Sign in to [Railway.app](https://railway.app/).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your `openGym` repository.

Railway will automatically detect the `Dockerfile` and `railway.json` configuration.

---

## 2. Configure Environment Variables

In your Railway service settings under the **Variables** tab, set the following environment variables:

| Variable | Recommended Value | Description |
|---|---|---|
| `RP_ID` | `your-app-name.up.railway.app` | Hostname for Passkey WebAuthn sign-ins |
| `ORIGIN` | `https://your-app-name.up.railway.app` | Complete HTTPS origin URL for your deployment |
| `RP_NAME` | `openGym` | Display name on WebAuthn passkey prompts |
| `DATA_DIR` | `/data` | Path to persistent storage |
| `ADMIN_UIDS` | *(Optional)* | Comma-separated user IDs for admin access |
| `INVITE_ONLY` | `0` | Set to `1` to require invite codes for signup |
| `ALLOW_GUEST` | `1` | Set to `0` to disable guest mode |

---

## 3. Attach a Persistent Volume (Data Storage)

To preserve user profiles, workout histories, and WebAuthn credentials across redeployments:

1. Click on your service node in Railway.
2. Select **Volume** → **Add Volume**.
3. Set Mount Path to: `/data`

---

## 4. Deploy & Generate Domain

1. Go to **Settings** → **Networking** → **Generate Domain**.
2. Copy your unique Railway domain (e.g. `opengym-production.up.railway.app`).
3. Ensure your `RP_ID` and `ORIGIN` variables match this domain.
4. Railway will automatically trigger a build and make openGym live! 🎉

---

## Healthcheck

Railway uses `/api/health` as the automated healthcheck endpoint to verify deployment status.
