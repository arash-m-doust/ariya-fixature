# Mirax Backend

## Setup

1. Copy `.env.example` to `.env`.
2. Set `REPLICATE_API_TOKEN`.
3. Install deps:

```bash
npm install
```

## Run

```bash
npm run dev
```

Server runs on `http://localhost:8787` by default.

## API

- `GET /api/health`
- `POST /api/generate`
  - body: `{ "photoDataUrl": "data:image/..." }`
  - creates image + QR in `backend/generated`
- `POST /api/register`
  - body: `{ "generationId": "mirax-...", "phone": "09..." }`
  - appends data to `backend/data/registrations.xlsx`

Generated images and QR codes are served at `/generated/:filename`.
