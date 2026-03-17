const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const express = require("express");
const pino = require("pino");
const readline = require("readline");

// 🌐 Express server (keeps Render alive)
const app = express();

app.get("/", (req, res) => {
  res.send("Jentle Bot V2 is running 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port " + PORT));

// 🤖 Start WhatsApp Bot
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["Jentle Bot", "Chrome", "1.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  // 📲 Pairing Code Setup
  if (!sock.authState.creds.registered) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question("Enter your WhatsApp number (e.g. 234XXXXXXXXXX): ", async (number) => {
      try {
        const code = await sock.requestPairingCode(number);
        console.log("\n🔑 Your Pairing Code:", code);
        console.log("👉 Go to WhatsApp > Linked Devices > Link with phone number\n");
        rl.close();
      } catch (err) {
        console.log("❌ Error generating pairing code:", err);
      }
    });
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
      } else {
        console.log("⚠️ Logged out. Restart and relink.");
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

    // Simple command
    if (text.toLowerCase() === "hi") {
      await sock.sendMessage(from, {
        text: "Hello 👋 I'm Jentle Bot V2 🤖"
      });
    }
  });
}

// 🚀 Run bot
startBot();
