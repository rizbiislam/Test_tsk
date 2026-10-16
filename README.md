# Meeting Timeline

> Intelligent Discussion, Dialogue & Q&A Synthesis with Executive PDF Reporting  
> Engineered by AeroTech · Standalone On-Device Architecture · Zero Server Dependency

---

## Features

- **Executive Meeting Timeline**: Real-time dialogue breakdown with chronological milestone tracking.
- **Smart Q&A Dialogue Extraction**: Automatically identifies inquiries and pairs them with direct spoken responses.
- **Executive Dossier**: Synthesizes long-form meetings into readable executive briefs.
- **1-Click Local PDF Report Export**: Generates a high-resolution, print-ready PDF briefing dossier saved with short, clean filenames (`Meeting_Timeline_YYYYMMDD_HHMM.pdf`).
- **Device-Safe UI**: Dynamic Android status bar/notch padding and bounded presentation viewports.
- **100% Standalone**: Runs completely on-device without requiring local servers or network relays.
- **Optimized Size**: Custom ABI architecture filter drops APK size from ~64 MB to ~19.9 MB.

---

## Remote Configuration (GitHub)

The app securely pulls configuration from your encrypted GitHub config:
`https://raw.githubusercontent.com/rizbiislam/Test_tsk/testb/config.json`

```json
{
  "is_app_enabled": true,
  "maintenance_mode": false,
  "maintenance_message": "Service maintenance in progress.",
  "force_update": false,
  "force_update_message": "A newer build is required.",
  "sponsor_api_url": "https://sponsor.ajay.app/api/skipSegments",
  "api_base_url": "",
  "features": {
    "sponsor_removal": true,
    "download_transcript": true,
    "share_button": true,
    "paragraph_mode": true
  },
  "announcement": "",
  "min_version": "1.0.0"
}
```

---

## Building the Standalone APK

```bash
cd mobile
eas build --platform android --profile preview
```
Or push to `main` branch to automatically trigger the automated GitHub Actions CI/CD workflow.
