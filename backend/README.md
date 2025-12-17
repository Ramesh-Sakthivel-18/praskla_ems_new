Backend setup for EMS

1. Place your Firebase service account JSON in this folder as `serviceAccountKey.json` (download from Firebase Console > Project Settings > Service accounts).
2. Install dependencies and start the server:

   npm install
   npm start

3. The server will expose endpoints on `/api/employees`, `/api/attendance`, and `/api/hikvision/webhook`.

4. Set the `FRONTEND_ORIGIN` env var to your frontend origin (e.g. `http://localhost:3000`) when starting the server, or edit `server.js` default.
