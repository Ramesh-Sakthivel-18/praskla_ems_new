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
      console.log("📥 Raw Hikvision data length:", raw.length);
      console.log("📥 Raw data sample (first 800 chars):", raw.substring(0, 800));

      // Try to find any JSON object in the multipart data
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Try brace-counting for proper JSON extraction
        const startIdx = raw.indexOf('{');
        if (startIdx !== -1) {
          let braceCount = 0;
          let endIdx = startIdx;
          for (let i = startIdx; i < raw.length; i++) {
            if (raw[i] === '{') braceCount++;
            if (raw[i] === '}') braceCount--;
            if (braceCount === 0) {
              endIdx = i + 1;
              break;
            }
          }
          const jsonStr = raw.substring(startIdx, endIdx);
          try {
            payload = JSON.parse(jsonStr);
            console.log("✅ JSON parsed, keys:", Object.keys(payload));
          } catch (e) {
            console.error("❌ JSON parse failed:", e.message);
            console.error("Attempted JSON:", jsonStr.substring(0, 300));
          }
        }
      } else {
        console.log("⚠️ No JSON found in multipart data");
      }
    } else if (contentType.includes("application/json")) {
      payload = await req.json();
      console.log("📥 Direct JSON, keys:", Object.keys(payload));
    } else {
      console.log("📥 Content-Type:", contentType);
      // Try to parse as JSON anyway for other content types
      try {
        const text = await req.text();
        console.log("📥 Raw text length:", text.length);
        if (text.startsWith('{')) {
          payload = JSON.parse(text);
          console.log("✅ Parsed as JSON, keys:", Object.keys(payload));
        }
      } catch (e) {
        console.log("ℹ️ Not JSON, ignoring");
      }
    }

    console.log("🔍 Payload result:", payload ? `Found with keys: ${Object.keys(payload)}` : "NULL");

    if (!payload || !payload.AccessControllerEvent) {
      console.log("⚠️ Missing AccessControllerEvent, available keys:", payload ? Object.keys(payload) : "none");
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

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("❌ Error:", err);
    return new Response("ERROR", { status: 500 });
  }
}

export async function GET() {
  return new Response("Event API Running", { status: 200 });
}
