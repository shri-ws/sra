/**
 * ============================================================
 *  SRA Consultation Booking — Google Apps Script
 *  Account: shriramjiastro7@gmail.com
 *  Consultation Duration: 90 minutes
 *  Deploy as: Web App → Execute as: Me → Access: Anyone
 * ============================================================
 *
 *  SETUP STEPS (one-time):
 *  1. Go to https://script.google.com → New Project
 *  2. Paste this entire file
 *  3. Services → Add → "Google Calendar API" (Calendar, v3)
 *  4. Deploy → New Deployment → Web App
 *     - Execute as: Me (shriramjiastro7@gmail.com)
 *     - Who has access: Anyone
 *  5. Copy the Web App URL → paste in consultation.html as APPS_SCRIPT_URL
 * ============================================================
 */

// ─── CONFIG ──────────────────────────────────────────────────
const CALENDAR_ID      = 'shriramjiastro7@gmail.com';
const OWNER_EMAIL      = 'shriramjiastro7@gmail.com';
const OWNER_NAME       = 'Astro Raamji';
const DURATION_MINUTES = 90;
const WEBSITE          = 'https://shriramjiastro.in';
const WHATSAPP_NUM     = '919517117775';

// ─── POST: Create Consultation Event ─────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const clientName   = data.name       || 'Client';
    const clientEmail  = data.email      || '';
    const clientPhone  = data.phone      || '';
    const clientDob    = data.dob        || '';
    const clientTob    = data.tob        || '';
    const clientPlace  = data.place      || '';
    const clientQuery  = data.query      || '';
    const inquiryType  = data.inquiry    || 'Kundli Reading';
    const reservedDate = data.date       || '';   // YYYY-MM-DD (IST)
    const paymentId    = data.payment_id || '';

    if (!reservedDate || !clientEmail) {
      return jsonResponse({ success: false, message: 'Date और Email ज़रूरी हैं।' });
    }

    // ── Parse 10:00 AM IST as start time ──────────────────────
    // Consultation time = 10:00 AM IST by default
    // (You can make this dynamic later)
    const startISO = reservedDate + 'T10:00:00+05:30';
    const startDT  = new Date(startISO);
    const endDT    = new Date(startDT.getTime() + DURATION_MINUTES * 60 * 1000);

    // ── Check if date is already booked ──────────────────────
    const cal    = CalendarApp.getCalendarById(CALENDAR_ID);
    const events = cal.getEvents(startDT, endDT);
    const alreadyBooked = events.some(ev =>
      ev.getTitle().includes('Consultation:') || ev.getTitle().includes('परामर्श:')
    );

    if (alreadyBooked) {
      return jsonResponse({
        success: false,
        message: 'इस तारीख पर पहले से Consultation बुक है। कृपया दूसरी तारीख चुनें।'
      });
    }

    // ── Create Event with Google Meet via Advanced Calendar API ──
    const eventResource = {
      summary: `🔮 Consultation: ${clientName}`,
      description: buildDescription(clientName, clientPhone, clientEmail,
                                     clientDob, clientTob, clientPlace,
                                     inquiryType, clientQuery, paymentId),
      start:       { dateTime: startDT.toISOString(), timeZone: 'Asia/Kolkata' },
      end:         { dateTime: endDT.toISOString(),   timeZone: 'Asia/Kolkata' },
      attendees:   clientEmail ? [{ email: clientEmail }] : [],
      conferenceData: {
        createRequest: {
          requestId: Utilities.getUuid(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    };

    // Insert event (Calendar Advanced Service required)
    const created = Calendar.Events.insert(
      eventResource,
      CALENDAR_ID,
      { conferenceDataVersion: 1, sendUpdates: 'all' }
    );

    // Extract Meet link
    const meetLink = extractMeetLink(created);

    // ── Send confirmation emails ──────────────────────────────
    sendClientEmail(clientName, clientEmail, startDT, endDT, meetLink, inquiryType);
    sendOwnerEmail(clientName, clientEmail, clientPhone, clientDob, clientTob,
                   clientPlace, inquiryType, clientQuery, startDT, meetLink, paymentId);

    return jsonResponse({
      success:  true,
      message:  'Consultation successfully booked! आपको email में Meet link मिल गया है।',
      meetLink: meetLink,
      date:     reservedDate,
      time:     '10:00 AM IST',
      eventId:  created.id
    });

  } catch (err) {
    Logger.log('doPost error: ' + err.message + '\n' + err.stack);
    return jsonResponse({ success: false, message: 'Error: ' + err.message });
  }
}

// ─── GET: Check if date is available ─────────────────────────
function doGet(e) {
  try {
    const date = (e.parameter && e.parameter.date) ? e.parameter.date : null;

    if (!date) {
      return jsonResponse({ error: 'date parameter required (YYYY-MM-DD)' });
    }

    const dayStart = new Date(date + 'T00:00:00+05:30');
    const dayEnd   = new Date(date + 'T23:59:59+05:30');
    const cal      = CalendarApp.getCalendarById(CALENDAR_ID);
    const events   = cal.getEvents(dayStart, dayEnd);

    // Blocked if: all-day event exists OR consultation already booked
    const isBlocked = events.some(ev =>
      ev.isAllDayEvent()                          ||
      ev.getTitle().toLowerCase().includes('blocked') ||
      ev.getTitle().toLowerCase().includes('unavailable') ||
      ev.getTitle().toLowerCase().includes('leave') ||
      ev.getTitle().toLowerCase().includes('holiday') ||
      ev.getTitle().includes('Consultation:')     ||
      ev.getTitle().includes('परामर्श:')
    );

    return jsonResponse({
      date:      date,
      available: !isBlocked,
      booked:    isBlocked
    });

  } catch (err) {
    Logger.log('doGet error: ' + err.message);
    return jsonResponse({ error: err.message });
  }
}

// ─── HELPERS ─────────────────────────────────────────────────

function extractMeetLink(event) {
  try {
    const conf = event.conferenceData;
    if (conf && conf.entryPoints) {
      for (const ep of conf.entryPoints) {
        if (ep.entryPointType === 'video') return ep.uri;
      }
    }
  } catch (e) {}
  return 'https://meet.google.com (Check your Calendar invite)';
}

function buildDescription(name, phone, email, dob, tob, place, inquiry, query, paymentId) {
  return [
    '🔮 Shri Ramji Astro — Private Consultation',
    '',
    '👤 Client Details:',
    `   Name          : ${name}`,
    `   DOB           : ${dob}`,
    `   TOB           : ${tob}`,
    `   Birth Place   : ${place}`,
    `   Phone         : ${phone}`,
    `   Email         : ${email}`,
    '',
    `🎯 Inquiry Type  : ${inquiry}`,
    `💬 Question      : ${query}`,
    '',
    paymentId ? `💳 Payment ID    : ${paymentId}` : '',
    '',
    `🌐 ${WEBSITE}`
  ].filter(l => l !== undefined).join('\n');
}

function sendClientEmail(name, email, start, end, meetLink, inquiryType) {
  if (!email) return;

  const dateStr  = Utilities.formatDate(start, 'Asia/Kolkata', 'dd MMM yyyy');
  const timeStr  = Utilities.formatDate(start, 'Asia/Kolkata', 'hh:mm a');
  const timeEnd  = Utilities.formatDate(end,   'Asia/Kolkata', 'hh:mm a');

  const subject = `✅ आपकी Consultation Confirm हो गई — Shri Ramji Astro`;

  const body = `
नमस्ते ${name} जी, 🙏

आपकी Consultation सफलतापूर्वक बुक हो गई है!

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 दिनांक  : ${dateStr}
⏰ समय     : ${timeStr} — ${timeEnd} (IST)
⏱️ अवधि   : 90 Minutes
🔮 विषय   : ${inquiryType}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎥 Google Meet Link:
${meetLink}

(यह link आपके Calendar invite में भी है।)

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 तैयारी के लिए:
• अपनी जन्म कुंडली (यदि हो) पास रखें
• जन्म समय की पुष्टि करें
• शांत स्थान पर बैठें
• Session से 5 मिनट पहले join करें
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 WhatsApp: wa.me/${WHATSAPP_NUM}
🌐 Website: ${WEBSITE}

॥ श्री राम जय राम जय जय राम ॥

Astro Raamji
Shri Ramji Astro
${WEBSITE}
`.trim();

  GmailApp.sendEmail(email, subject, body);
}

function sendOwnerEmail(name, email, phone, dob, tob, place, inquiry, query, start, meetLink, paymentId) {
  const dateStr = Utilities.formatDate(start, 'Asia/Kolkata', 'dd MMM yyyy');
  const timeStr = Utilities.formatDate(start, 'Asia/Kolkata', 'hh:mm a z');

  const subject = `🔔 नई Consultation Booked: ${name} — ${dateStr}`;

  const body = `
नई Consultation बुक हुई है!

━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Client  : ${name}
📧 Email   : ${email}
📱 Phone   : ${phone}
🎂 DOB     : ${dob}
⏰ TOB     : ${tob}
📍 Place   : ${place}
🎯 Inquiry : ${inquiry}
💬 Query   : ${query}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Date    : ${dateStr} at ${timeStr}
🎥 Meet    : ${meetLink}
💳 Payment : ${paymentId || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Google Calendar में event add हो गया है।
`.trim();

  GmailApp.sendEmail(OWNER_EMAIL, subject, body);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
