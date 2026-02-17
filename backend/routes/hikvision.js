const express = require('express');
const router = express.Router();
const container = require('../container');
const db = container.db;

// Helper functions (copied from original Next.js route)
function getVerifyMode(code) {
    const map = {
        38: "Fingerprint",
        75: "Face",
        76: "Face",
        1: "Card",
        25: "Card",
        10: "Card", // Added 10 as per original map
    };
    return map[code] || "Unknown";
}

function getTimeString(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function getDateString(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US");
}

router.post('/', async (req, res) => {
    try {
        const contentType = req.headers['content-type'] || "";
        let payload = null;

        console.log(`📥 Received Hikvision Event. Content-Type: ${contentType}`);

        // Express body-parser handles JSON automatically if configured
        if (req.body && Object.keys(req.body).length > 0) {
            payload = req.body;
            console.log("✅ Body parsed by Express:", Object.keys(payload));
        } else {
            // Fallback for raw text/multipart handling if body-parser didn't catch it
            // Note: In a typical Express setup with app.use(express.json()), req.body is already an object.
            // For multipart/form-data, we'd need multer, but the original code did manual parsing.
            // We'll trust mostly on JSON or pre-parsed body here.
            console.log("⚠️ Body empty or not parsed automatically.");
        }

        // Manual Multipart/Text handling logic from original (simplified for Express)
        // If req.body is empty, it might be because of content-type mismatch or missing middleware

        if (!payload && contentType.includes("multipart/form-data")) {
            console.log("⚠️ Multipart data received but not parsed. Ensure 'multer' or similar is used if needed.");
            // For now, returning IGNORED if we can't parse it, 
            // essentially enforcing JSON or proper body parsing upstream.
        }

        console.log("🔍 Payload result:", payload ? `Found with keys: ${Object.keys(payload)}` : "NULL");

        if (!payload || !payload.AccessControllerEvent) {
            console.log("⚠️ Missing AccessControllerEvent, available keys:", payload ? Object.keys(payload) : "none");
            return res.status(200).send("IGNORED");
        }

        const e = payload.AccessControllerEvent;
        const employeeId = e.employeeNoString ?? null;
        const employeeName = e.name ?? null;
        const attendanceStatus = e.attendanceStatus ?? null;
        const verifyMode = getVerifyMode(e.subEventType);
        const scanTime = new Date().toISOString();

        if (!employeeId || !employeeName || !attendanceStatus) {
            return res.status(200).send("IGNORED (NO EMPLOYEE DATA)");
        }

        const dateString = getDateString(scanTime);
        const timeString = getTimeString(scanTime);

        console.log("🎯 Processing attendance:", { employeeId, employeeName, attendanceStatus, verifyMode });

        // 1️⃣ SAVE RAW HIKVISION DATA (for logs/audit)
        try {
            const logRef = await db.collection("hikvision_logs").add({
                employeeId,
                employeeName,
                attendanceStatus,
                verifyMode,
                scanTime,
            });
            console.log("✅ Saved to hikvision_logs:", logRef.id);
        } catch (saveErr) {
            console.error("❌ Failed to save to hikvision_logs:", saveErr.message);
        }

        // 2️⃣ UPDATE EMS ATTENDANCE RECORD
        const attendanceRef = db.collection("attendance");
        const existingQuery = await attendanceRef
            .where("employeeId", "==", employeeId)
            .where("date", "==", dateString)
            .limit(1)
            .get();

        if (existingQuery.empty) {
            await attendanceRef.add({
                employeeId,
                employeeName,
                date: dateString,
                checkIn: attendanceStatus === "checkIn" ? timeString : null,
                checkOut: attendanceStatus === "checkOut" ? timeString : null,
                breakIn: null,
                breakOut: null,
                verifyMode,
                createdAt: scanTime,
                updatedAt: scanTime
            });
            console.log("✅ NEW EMS record:", employeeId, dateString);
        } else {
            const docRef = existingQuery.docs[0].ref;
            const existingData = existingQuery.docs[0].data();
            const updateData = { updatedAt: scanTime, verifyMode };

            if (attendanceStatus === "checkIn" && !existingData.checkIn) {
                updateData.checkIn = timeString;
            } else if (attendanceStatus === "checkOut" && !existingData.checkOut) {
                updateData.checkOut = timeString;
            }

            await docRef.update(updateData);
            console.log("✅ UPDATED EMS record:", employeeId);
        }

        return res.status(200).send("OK");
    } catch (err) {
        console.error("❌ Error:", err);
        return res.status(500).send("ERROR");
    }
});

router.get('/', (req, res) => {
    res.status(200).send("Event API Running");
});

module.exports = router;
