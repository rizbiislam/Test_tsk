# AeroTech — YouTube Transcript Extractor App

> Internal Tools Division · Standalone · Zero Local Dependency · Secure · Remote-Controlled

---

## Architecture Overview

```
                               ┌──────────────────────────────────────────────────┐
                               │   Your Remote GitHub Config (Private/Secret)     │
                               │   https://.../rizbiislam/Test_tsk/.../config.json │
                               └────────────────────────┬─────────────────────────┘
                                                        │
                      Encrypted Cipher Decrypted in App │ (Loaded at runtime only)
                                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ AeroTech Mobile App (Standalone on Device)                                             │
│                                                                                        │
│  1. Check Kill Switch & Features:                                                      │
│     - is_app_enabled / maintenance_mode                                                │
│     - reads `sponsor_api_url` from config (NOT hardcoded in app)                       │
│                                                                                        │
│  2. Direct Extraction (Zero Local Machine Dependency):                                 │
│     - Fetches YouTube captions directly via InnerTube Android Client                   │
│     - Queries `sponsor_api_url` secretly to retrieve skip segments                     │
│     - Filters out sponsored intervals, promos, and interactions                        │
│                                                                                        │
│  3. Smart Q&A Formatting:                                                              │
│     - Detects questions & separates them onto individual lines                         │
│     - Answers grouped cleanly underneath with visual badges                            │
│     - Toggle between [ 💬 Q&A Flow ] and [ 📄 Paragraphs ]                             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Remote Control via GitHub

Your GitHub config link is already encrypted into the app:
`https://raw.githubusercontent.com/rizbiislam/Test_tsk/testb/config.json`

### Recommended JSON format for your GitHub repo:
```json
{
  "is_app_enabled": true,
  "maintenance_mode": false,
  "maintenance_message": "We'll be back shortly. Thanks for your patience.",
  "force_update": false,
  "force_update_message": "A critical update is required. Please update the app.",
  "sponsor_api_url": "https://sponsor.ajay.app/api/skipSegments",
  "api_base_url": "",
  "features": {
    "sponsor_removal": true,
    "download_transcript": true,
    "share_button": true,
    "paragraph_mode": true
  },
  "dynamic_update": {
    "enabled": false,
    "bundle_url": ""
  },
  "announcement": "",
  "min_version": "1.0.0"
}
```

- **Kill Switch**: Set `"is_app_enabled": false` to instantly block app access.
- **Sponsor API**: Loaded secretly from `"sponsor_api_url"` so no API endpoints are hardcoded in the app.
- **Standalone**: Leave `"api_base_url": ""` empty — the app runs 100% on-device with no local server required.

---

## 2. Testing Locally

```bash
cd mobile
npx expo start
```
- Press **`w`** to test directly in your browser.
- Scan the QR code with **Expo Go** on your Android or iPhone.

---

## 3. How to Build the Standalone APK (100% Free)

No debit or credit card required.

### Step 1: Login to Expo EAS (one-time)
```bash
cd mobile
npx eas-cli login
```
*(If you don't have a free Expo account yet, create one at [expo.dev](https://expo.dev) or run `npx eas-cli register`)*.

### Step 2: Build the APK
```bash
npx eas-cli build --platform android --profile preview
```
- EAS will build the `.apk` file in the cloud.
- When finished, EAS prints a direct download link and QR code for the `.apk` file.
- Download the `.apk` and share it directly with anyone — it runs standalone on any Android phone without needing your PC!
