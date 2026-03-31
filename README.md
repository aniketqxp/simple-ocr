# OCR Web App

A browser-based OCR app built with Vite and vanilla JavaScript. It converts images into extracted text and offers a code mode for noisy OCR code transcripts.

## Features

- Drag & drop or paste images from the clipboard
- Text extraction mode for clean text output
- Code mode for OCR'd code with optional AI-assisted cleanup
- Progress indicator while processing images
- Copy and download extracted text
- Light / dark theme switch

## Getting started

```bash
npm install
npm run dev
```

Open the local server URL shown by Vite.

## Build

```bash
npm run build
```

## Environment

If you want to enable AI-based code formatting, create a `.env` file from `.env.example` and set `VITE_HF_API_TOKEN`.

Without this token, code mode will still work, but it will only apply local OCR cleanup and not perform remote AI formatting.

> Note: client-side environment variables are bundled into the app. For production usage, keep sensitive keys on a backend service.

## Project structure

- `index.html` — Vite entry point and app markup
- `src/main.js` — application bootstrap
- `src/app.js` — app state, UI wiring, and workflow logic
- `src/ocr.js` — Tesseract OCR integration
- `src/format.js` — text/code formatting helpers
- `src/llm.js` — optional AI code formatting wrapper
- `src/styles.css` — app styling

## Notes

Legacy files have been cleaned up so the repo stays focused on the Vite-powered app.
