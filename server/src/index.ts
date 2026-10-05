import { app } from "./app";

const PORT = parseInt(process.env.BACKEND_PORT || "5000", 10);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n======================================================`);
  console.log(`🚀 [LangGPT Backend] Node.js Express server is LIVE`);
  console.log(`🌐 Base URL:      http://localhost:${PORT}`);
  console.log(`📡 Health Check:  http://localhost:${PORT}/health`);
  console.log(`💬 Chat API:      http://localhost:${PORT}/api/chat`);
  console.log(`======================================================\n`);
});
