const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const express = require("express");
const pino = require("pino");

// 🌐 Express server
const app = express();

app.get("/", (req, res) => {
  res.send("Jentle Bot V2 is running 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port " + PORT));

// 🔑 PUT YOUR NUMBER HERE
const phoneNumber = "2348106184386"; // replace with your number

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["Jentle Bot", "Chrome", "1.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  // 📲 Auto pairing code
  if (!sock.authState.creds.registered) {
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log("\n🔑 Your Pairing Code:", code);
      console.log("👉 Go to WhatsApp > Linked Devices > Link with phone number\n");
    } catch (err) {
      console.log("❌ Error generating pairing code:", err);
    }
  }

  // 🔄 Connection handling
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log("❌ Connection closed. Reconnecting...", shouldReconnect);

      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === "open") {
      console.log("✅ Jentle Bot connected successfully!");
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

    if (text.toLowerCase() === "hi") {
      await sock.sendMessage(from, {
        text: "Hello 👋 I'm Jentle Bot V2 🤖"
      });
    }
  });
}

startBot();
