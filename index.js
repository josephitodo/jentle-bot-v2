const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("@whiskeysockets/baileys");
const express = require("express");
const pino = require("pino");

// 🌐 Server
const app = express();

app.get("/", (req, res) => {
  res.send("Jentle Bot V2 is running 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🌐 Server running on port " + PORT));

// 🔑 Your number
const phoneNumber = "2348106184386"; // put your number

async function startBot() {
  console.log("🚀 Starting bot...");

  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["Ubuntu", "Chrome", "20.0.04"] // 👈 VERY IMPORTANT (fixes issue)
  });

  sock.ev.on("creds.update", saveCreds);

  // 🔑 Generate pairing code EARLY
  if (!sock.authState.creds.registered) {
    await delay(3000); // 👈 wait before requesting

    try {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log("\n🔑 Pairing Code:", code);
      console.log("👉 WhatsApp > Linked Devices > Link with phone number\n");
    } catch (err) {
      console.log("❌ Pairing error:", err.message);
    }
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("✅ Bot connected successfully!");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log("❌ Disconnected. Reconnecting in 5s...");

      if (shouldReconnect) {
        setTimeout(() => startBot(), 5000); // 👈 slower reconnect
      }
    }
  });

  // 📩 Messages
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text;

    if (!text) return;

    console.log("📩", text);

    if (text.toLowerCase() === "hi") {
      await sock.sendMessage(from, {
        text: "Hello 👋 I'm Jentle Bot V2 🤖"
      });
    }
  });
}

startBot();
