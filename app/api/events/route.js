import { db } from "../../config/firebaseAdmin";

function getVerifyMode(code) {
  const map = {
    38: "Fingerprint",
    75: "Face",
    76: "Face",
    1: "Card",
    25: "Card",
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

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let payload = null;

    if (contentType.includes("multipart/form-data")) {
      const raw = await req.text();
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) payload = JSON.parse(match[0]);
    } else if (contentType.includes("application/json")) {
      payload = await req.json();
    }

    if (!payload || !payload.AccessControllerEvent) {
      return new Response("IGNORED", { status: 200 });
    }

    const e = payload.AccessControllerEvent;
    const employeeId = e.employeeNoString ?? null;
    const employeeName = e.name ?? null;
    const attendanceStatus = e.attendanceStatus ?? null;
    const verifyMode = getVerifyMode(e.subEventType);
    const scanTime = new Date().toISOString();

    if (!employeeId || !employeeName || !attendanceStatus) {
      return new Response("IGNORED (NO EMPLOYEE DATA)", { status: 200 });
    }

    const dateString = getDateString(scanTime);
    const timeString = getTimeString(scanTime);

    // 1️⃣ SAVE RAW HIKVISION DATA (for logs/audit)
    await db.collection("hikvision_logs").add({
      employeeId,
      employeeName,
      attendanceStatus,
      verifyMode,
      scanTime,
    });

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

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("❌ Error:", err);
    return new Response("ERROR", { status: 500 });
  }
}

export async function GET() {
  return new Response("Event API Running", { status: 200 });
}
