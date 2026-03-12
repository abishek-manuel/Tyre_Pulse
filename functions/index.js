/**
 * Firebase Cloud Functions – Tyre Pulse
 * ─────────────────────────────────────
 * Scheduled daily at 08:00 IST (India Standard Time, UTC+5:30).
 *
 * What it does every morning:
 *  1. Reads every user from Firestore
 *  2. Reads each user's vehicles
 *  3. Calculates projected tyre wear, rotation, and alignment due dates
 *  4. Sends a personalised maintenance email if any alerts are triggered
 *
 * SETUP (do once before deploying):
 *   firebase functions:config:set mail.user="yourGmail@gmail.com" mail.pass="your-16-char-app-password"
 *
 * Then deploy with:
 *   firebase deploy --only functions
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineString }  = require("firebase-functions/params");
const admin             = require("firebase-admin");
const nodemailer        = require("nodemailer");

admin.initializeApp();

// ── Email credentials (set via Firebase config, never hardcoded) ──────────────
// Before deploying run:
//   firebase functions:config:set mail.user="you@gmail.com" mail.pass="xxxx xxxx xxxx xxxx"
// Or set them as environment variables in Firebase Console → Functions → Configuration
const MAIL_USER = process.env.MAIL_USER || "your-email@gmail.com";
const MAIL_PASS = process.env.MAIL_PASS || "your-app-password";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: MAIL_USER,
        pass: MAIL_PASS
    }
});

// ── Scheduled trigger: 08:00 IST daily ───────────────────────────────────────
// Cron "30 2 * * *" = 02:30 UTC = 08:00 IST (UTC+5:30)
exports.dailyVehicleHealthCheck = onSchedule(
    {
        schedule: "30 2 * * *",   // 08:00 IST
        timeZone: "Asia/Kolkata", // ensures display/logging in IST
        timeoutSeconds: 540,
        memory: "256MiB"
    },
    async (event) => {
        const db = admin.firestore();
        console.log(`[Tyre Pulse] Daily check started at ${new Date().toISOString()}`);

        const usersSnapshot = await db.collection("users").get();
        let emailsSent = 0;
        let usersProcessed = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userData   = userDoc.data();
            const userEmail  = userData.email;
            const userName   = userData.displayName || userData.email?.split("@")[0] || "User";

            if (!userEmail) continue;
            usersProcessed++;

            const vehiclesRef      = db.collection("users").doc(userDoc.id).collection("vehicles");
            const vehiclesSnapshot = await vehiclesRef.get();
            if (vehiclesSnapshot.empty) continue;

            const vehicleAlerts = []; // collect all vehicles with alerts for this user

            for (const vehicleDoc of vehiclesSnapshot.docs) {
                const vehicle = vehicleDoc.data();
                const alerts  = [];

                // ── 1. Daily odometer projection ─────────────────────────────
                const avgDailyKm   = vehicle.avgDailyKm || 40;
                const newOdometer  = (vehicle.currentOdometer || 0) + avgDailyKm;

                // ── 2. Tyre wear analysis ─────────────────────────────────────
                if (vehicle.tyres && typeof vehicle.tyres === "object") {
                    Object.entries(vehicle.tyres).forEach(([key, tyre]) => {
                        const expectedLife = tyre.expectedLifeKm || 40000;
                        const installKm    = tyre.installationKm  || 0;
                        const kmDriven     = Math.max(0, newOdometer - installKm);
                        const wearPercent  = (kmDriven / expectedLife) * 100;
                        const position     = tyre.position || key;
                        const brand        = tyre.brand    || "Tyre";

                        if (wearPercent >= 90) {
                            alerts.push({
                                level: "🔴 Critical",
                                msg: `<strong>${position} ${brand}</strong> is <strong>${wearPercent.toFixed(1)}% worn</strong> — immediate replacement needed.`
                            });
                        } else if (wearPercent >= 75) {
                            alerts.push({
                                level: "🟡 Warning",
                                msg: `<strong>${position} ${brand}</strong> is <strong>${wearPercent.toFixed(1)}% worn</strong> — plan a replacement soon.`
                            });
                        }
                    });
                }

                // ── 3. Months-remaining reminder based on replacementDueDate ─────
                if (vehicle.replacementDueDate) {
                    const dueDate  = new Date(vehicle.replacementDueDate);
                    const today    = new Date();
                    const msLeft   = dueDate - today;
                    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

                    if (daysLeft <= 0) {
                        alerts.push({
                            level: "🔴 Overdue",
                            msg: `Tyre replacement is <strong>overdue</strong> for <strong>${vehicle.name || vehicle.plate}</strong>. Please replace immediately.`
                        });
                    } else if (daysLeft <= 30) {
                        alerts.push({
                            level: "🟡 Due Soon",
                            msg: `Tyre replacement is due in approximately <strong>${daysLeft} days</strong> (around <strong>${dueDate.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</strong>). Plan a service appointment.`
                        });
                    } else if (daysLeft <= 60) {
                        alerts.push({
                            level: "ℹ️ Reminder",
                            msg: `Your tyres are due for replacement in about <strong>${Math.ceil(daysLeft / 30)} months</strong>. Consider booking in advance.`
                        });
                    }
                }

                // ── 4. Rotation & Alignment from maintenance history ──────────
                if (Array.isArray(vehicle.maintenanceHistory)) {
                    const rotations  = vehicle.maintenanceHistory.filter(m => m.type === "Tire Rotation");
                    const alignments = vehicle.maintenanceHistory.filter(m => m.type === "Wheel Alignment");

                    if (rotations.length > 0) {
                        const last = rotations.sort((a, b) => b.nextDue - a.nextDue)[0];
                        if (newOdometer >= last.nextDue) {
                            alerts.push({
                                level: "🔵 Due",
                                msg: `<strong>Tire Rotation</strong> is due — odometer has reached <strong>${newOdometer.toFixed(0)} km</strong>.`
                            });
                        }
                    }

                    if (alignments.length > 0) {
                        const last = alignments.sort((a, b) => b.nextDue - a.nextDue)[0];
                        if (newOdometer >= last.nextDue) {
                            alerts.push({
                                level: "🔵 Due",
                                msg: `<strong>Wheel Alignment</strong> check is due at your current mileage.`
                            });
                        }
                    }
                } else {
                    // Fallback: fixed-interval reminders
                    if (newOdometer > 0 && newOdometer % 10000 < avgDailyKm) {
                        alerts.push({
                            level: "ℹ️ Reminder",
                            msg: `You've hit a <strong>${Math.round(newOdometer / 10000) * 10000} km</strong> milestone — time to rotate your tyres.`
                        });
                    }
                    if (newOdometer > 0 && newOdometer % 15000 < avgDailyKm) {
                        alerts.push({
                            level: "ℹ️ Reminder",
                            msg: `Wheel alignment check recommended at <strong>${Math.round(newOdometer / 15000) * 15000} km</strong>.`
                        });
                    }
                }

                // ── 4. Update projected odometer in Firestore ─────────────────
                await vehiclesRef.doc(vehicleDoc.id).update({
                    currentOdometer:     newOdometer,
                    lastCalculatedDate:  admin.firestore.FieldValue.serverTimestamp()
                });

                if (alerts.length > 0) {
                    vehicleAlerts.push({ vehicle, alerts, newOdometer });
                }
            }

            // ── 5. Send ONE email per user (covering all their vehicles) ─────
            if (vehicleAlerts.length > 0) {
                const vehicleSections = vehicleAlerts.map(({ vehicle, alerts, newOdometer }) => {
                    const alertRows = alerts.map(a => `
                        <tr>
                            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
                                <span style="font-size:14px;">${a.level}</span>
                            </td>
                            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;">
                                ${a.msg}
                            </td>
                        </tr>`).join("");

                    return `
                        <div style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                            <div style="background:#1e293b;padding:12px 16px;">
                                <span style="color:#fff;font-weight:bold;font-size:15px;">
                                    🚗 ${vehicle.name || vehicle.plate || "Your Vehicle"}
                                </span>
                                <span style="color:#94a3b8;font-size:12px;margin-left:12px;">
                                    Odometer: ~${newOdometer.toFixed(0)} km
                                </span>
                            </div>
                            <table style="width:100%;border-collapse:collapse;">
                                ${alertRows}
                            </table>
                        </div>`;
                }).join("");

                const emailHtml = `
                    <div style="font-family:'Inter',Arial,sans-serif;max-width:620px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">

                        <!-- Header -->
                        <div style="background:#d9534f;border-radius:10px;padding:20px 24px;margin-bottom:24px;text-align:center;">
                            <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">🔧 Tyre Pulse</h1>
                            <p style="color:#ffcdd2;margin:4px 0 0;font-size:13px;">Daily Vehicle Health Report</p>
                        </div>

                        <!-- Greeting -->
                        <p style="font-size:15px;color:#334155;margin:0 0 8px;">Hi <strong>${userName}</strong>,</p>
                        <p style="font-size:14px;color:#64748b;margin:0 0 20px;line-height:1.6;">
                            Good morning! Your daily tyre health check is ready.
                            Here's what needs your attention today:
                        </p>

                        <!-- Vehicle Sections -->
                        ${vehicleSections}

                        <!-- Footer -->
                        <div style="border-top:1px solid #e2e8f0;margin-top:24px;padding-top:16px;text-align:center;">
                            <p style="font-size:12px;color:#94a3b8;margin:0;">
                                This email was sent automatically by <strong>Tyre Pulse</strong> at 8:00 AM IST.<br>
                                Log in to your account for detailed analysis and booking a service appointment.
                            </p>
                        </div>
                    </div>`;

                try {
                    await transporter.sendMail({
                        from:    `"Tyre Pulse" <${MAIL_USER}>`,
                        to:      userEmail,
                        subject: `🔧 Daily Tyre Health Alert – ${new Date().toLocaleDateString("en-IN", { day:"numeric", month:"short" })}`,
                        html:    emailHtml
                    });
                    console.log(`[Tyre Pulse] ✅ Email sent → ${userEmail}`);
                    emailsSent++;
                } catch (err) {
                    console.error(`[Tyre Pulse] ❌ Failed to email ${userEmail}:`, err.message);
                }
            }
        }

        console.log(`[Tyre Pulse] Done. Processed ${usersProcessed} users, sent ${emailsSent} alert emails.`);
    }
);
