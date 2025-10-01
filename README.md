# AI + Augmented Reality Medical Assistant

An end-to-end demo application combining a React frontend with a Node/Express backend to assist manufacturing/medical workflows. The app captures audio and video through a browser (can be configured to receive data from Ray-Ban Meta through OBS), sends data to the backend, and uses Claude (Anthropic) for:
- Face identification (with optional reference image comparison) and showing patient history
- Reading scale measurements from an image and checking against a target
- Verifying a medicine label/image against expected options
- Extracting numerical medical information from a transcript and formatting it into a concise medical log

Reached the finals of the Oxford BuildX 2025 Hackathon.

Demo video:
https://youtu.be/1ElvHgubaOg


## Project Structure

```
BuildX2/
  express-backend/
    server.js                 # Express API with endpoints and Anthropic integration
    patient_database.js       # Mock patient histories keyed by recognized person
    add_reference_image.js    # Script to add reference face images
    media/                    # Saved uploaded/captured images (git-ignored recommended)
    reference_faces/          # Reference images for facial recognition (person1..4)
    summaries/                # Saved text summaries from /api/process
    package.json
  frontend/
    src/
      App.js                  # Main UI shell and flow
      components/
        AudioRecorder.js      # Speech recognition + manual text fallback
        VideoCapture.js       # Webcam capture + face/scale/medicine flows
        ResultDisplay.js      # Displays medical log results from backend
    package.json
  README.md
```


## Requirements

- Node.js 18+
- Yarn or npm
- macOS/Windows/Linux with a camera and microphone (browser permissions required)
- Anthropic API key for Claude (Haiku model)


## Quick Start

### 1) Backend

1. Create an `.env` in `express-backend/` with your Anthropic key:
   ```bash
   cd express-backend
   echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
   ```
2. Install and run:
   ```bash
   npm install
   npm run dev   # or: npm start
   ```
   Backend runs on `http://localhost:8080`.

3. Optional: add reference face images (improves face matching):
   - Place files in `express-backend/reference_faces/` as `person1.jpg/png`, `person2...`, up to `person4...`
   - Or use the helper script:
     ```bash
     node add_reference_image.js 1 /absolute/path/to/your/person1.jpg
     ```

### 2) Frontend

1. Start the React app:
   ```bash
   cd ../frontend
   npm install
   npm start
   ```
   Frontend runs on `http://localhost:3000` and calls the backend at `http://localhost:8080`.


## How It Works

- Frontend `VideoCapture` uses `getUserMedia` to access the camera. It can:
  - Capture a face image and call `POST /api/recognize-face`.
  - Capture a scale image and call `POST /api/analyze-image`.
  - Capture a medicine image and call `POST /api/verify-medicine`.
- Frontend `AudioRecorder` uses Web Speech API when available. If unsupported, it falls back to manual text input.
- When you end the stream (End Stream), the text is sent to `POST /api/process`, which asks Claude to extract numerical medical info and saves the response under `express-backend/summaries/`.


## API Reference (Backend)

Base URL: `http://localhost:8080`

- POST `/api/recognize-face`
  - Body: `{ image: "data:image/jpeg;base64,..." }`
  - Response:
    ```json
    {
      "success": true,
      "person_id": 1,
      "person_name": "Patient 298jx",
      "person_profession": "Doctor",
      "confidence": 85,
      "reference_comparison": true,
      "reference_image_url": "/reference_faces/person1.jpg",
      "patient_data": { /* see patient_database.js */ }
    }
    ```
  - Notes: If no reference images are found, it performs one-image recognition. On errors, it returns a deterministic fallback result.

- POST `/api/analyze-image`
  - Body: `{ image: "data:image/jpeg;base64,..." }`
  - Purpose: Read the scale value from an image and compare to a target (20g).
  - Response:
    ```json
    {
      "success": true,
      "analysis": "...model text...",
      "analysis_file": "analysis-...jpeg",
      "weight": 18,
      "unit": "g",
      "targetWeight": 20,
      "hasOvershot": false,
      "weightInGrams": 18
    }
    ```

- POST `/api/verify-medicine`
  - Body: `{ image: "data:image/jpeg;base64,...", patientId: "298jx" }`
  - Purpose: Identify a medicine label among A/B/C and flag mismatches or allergies.
  - Response:
    ```json
    {
      "success": true,
      "detectedMedicineCode": "B",
      "correctMedicineCode": "B",
      "detectedMedicine": "Clindamycin",
      "correctMedicine": "Clindamycin",
      "isCorrectMedicine": true,
      "allergyWarning": null,
      "confidence": 85,
      "message": "Correct medicine (Clindamycin) detected.",
      "analysis_file": "medicine-...jpeg"
    }
    ```
  - Notes: If the model call fails, a deterministic fallback based on the image bytes is used.

- POST `/api/process`
  - Body: `{ text: "string" }` (image optional and currently not sent from frontend)
  - Purpose: Extract numerical medical info from the transcript and format concise medical log entries.
  - Response:
    ```json
    {
      "success": true,
      "summary": "1. Heart rate: 72 BPM...",
      "summary_file": "2025-...txt",
      "image_file": null
    }
    ```

- GET `/api/status`
  - Health check returning `{ status: 'ok' }`.


## Environment Variables

Create `express-backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=8080       # optional
```


## Running Locally

- Terminal 1:
  ```bash
  cd express-backend && npm run dev
  ```
- Terminal 2:
  ```bash
  cd frontend && npm start
  ```
- Open `http://localhost:3000` in a modern browser (Chrome recommended). Allow camera and microphone.


## Reference Images

- Put reference images into `express-backend/reference_faces/` named `person1.jpg/png`, `person2...`, `person3...`, `person4...`.
- The backend attempts to auto-detect alternate extensions and files that start with `person<ID>`.
- You can also set any other images; the server will try to map available files to the internal list.


## .gitignore (recommended)

At repo root, add a `.gitignore` like:
```
node_modules/
frontend/node_modules/
express-backend/node_modules/
*.log
frontend/frontend.log
express-backend/express.log
express-backend/express-server.log
build/
dist/
.DS_Store
.env
.env.*.local
express-backend/media/
```
Remove `express-backend/media/` from `.gitignore` if you want media tracked.


## Troubleshooting

- CORS errors from frontend → ensure backend is running at `http://localhost:8080` and server has `cors({ origin: 'http://localhost:3000' })`.
- 401/403 from Anthropic → verify `ANTHROPIC_API_KEY` in `express-backend/.env` and restart the server.
- Camera/mic not working → check browser permissions; reload the page. Some browsers don’t support Web Speech API; the UI will fall back to manual input.
- Face recognition says no reference images → place `person1..4` images under `express-backend/reference_faces/` or ignore; the server can still attempt single-image identification.
- Git push errors (wrong remote/non-fast-forward) → set your own remote: `git remote set-url origin https://github.com/<you>/<repo>.git` and push, or pull with `--rebase` first.


## Security Notes

- Do not commit `.env` or real patient data.
- This is a demo; model prompts and fallbacks are simplified and not suitable for clinical use.


## License

This project is provided as-is for demonstration and educational purposes. License: ISC (see `express-backend/package.json`).
