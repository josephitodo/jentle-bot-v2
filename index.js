const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const express = require("express");
const pino = require("pino");

// 🌐 Web server
const app = express();

app.get("/", (req, res) => {
  res.send("Jentle Bot V2 is running 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🌐 Server running on port " + PORT));

// 🔑 Your number (edit this)
const phoneNumber = "2348106184386";

// 🤖 Start bot
async function startBot() {
  console.log("🚀 Starting WhatsApp bot...");

  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    logger: pino({ level: "debug" }), // 👈 show logs now
    auth: state,
    browser: ["Jentle Bot", "Chrome", "1.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  let pairingDone = false;

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    console.log("📡 Connection update:", connection);

    if (connection === "open") {
      console.log("✅ WhatsApp connected!");

      if (!sock.authState.creds.registered && !pairingDone) {
        pairingDone = true;

        try {
          const code = await sock.requestPairingCode(phoneNumber);
          console.log("\n🔑 Pairing Code:", code);
          console.log("👉 Use Linked Devices > Link with phone number\n");
        } catch (err) {
          console.log("❌ Pairing error:", err);
        }
      }
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log("❌ Connection closed. Reconnecting...", shouldReconnect);

      if (shouldReconnect) {
        setTimeout(() => startBot(), 3000); // 👈 delay reconnect
      } else {
        console.log("⚠️ Logged out.");
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

    console.log("📩 Message:", text);

    if (text.toLowerCase() === "hi") {
      await sock.sendMessage(from, {
        text: "Hello 👋 I'm Jentle Bot V2 🤖"
      });
    }
  });
}

// 🚀 Run
startBot();
