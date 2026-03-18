const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("@whiskeysockets/baileys");
const express = require("express");
const pino = require("pino");

// 🌐 Web server (Render)
const app = express();

app.get("/", (req, res) => {
  res.send("Jentle Bot V2 is running 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🌐 Server running on port " + PORT));

// 🔑 PUT YOUR NUMBER HERE (NO +)
const phoneNumber = "2348106184386"; // e.g. 2348123456789

async function startBot() {
  console.log("🚀 Starting bot...");

  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["Ubuntu", "Chrome", "20.0.04"] // important for Render stability
  });

  sock.ev.on("creds.update", saveCreds);

  // 🔑 Generate pairing code (ONLY if not registered)
  if (!sock.authState.creds.registered) {
    await delay(4000); // wait a bit before requesting

    try {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log("\n🔑 Pairing Code:", code);
      console.log("👉 WhatsApp > Linked Devices > Link with phone number\n");
    } catch (err) {
      console.log("❌ Pairing error:", err.message);
    }
  }

  // 🔄 Connection handling
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("✅ Bot connected successfully!");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        console.log("⚠️ Logged out. Please relink.");
      } else {
        console.log("⏸️ Connection closed. Waiting before reconnect...");

        setTimeout(() => {
          startBot();
        }, 15000); // ⏳ wait 15 seconds before reconnect
      }
    }
  });

  // 📩 Message listener
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text;

    if (!text) return;

    console.log("📩 Message:", text);

    // simple command
    if (text.toLowerCase() === "hi") {
      await sock.sendMessage(from, {
        text: "Hello 👋 I'm Jentle Bot V2 🤖"
      });
    }
  });
}

// 🚀 Start bot
startBot();
