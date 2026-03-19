const { spawn } = require("node:child_process");
const dotenv = require("dotenv");

dotenv.config({ quiet: true });

const command = process.argv[2];
const extraArgs = process.argv.slice(3);

if (!command || (command !== "dev" && command !== "start")) {
  console.error(
    "Usage: node scripts/run-next-with-env-port.js <dev|start> [next args...]"
  );
  process.exit(1);
}

const hasPortArg = extraArgs.some(
  (arg) =>
    arg === "-p" ||
    arg === "--port" ||
    arg.startsWith("--port=") ||
    arg.startsWith("-p=") ||
    /^-p\d+$/.test(arg)
);
const port = process.env.PORT;
const nextBin = require.resolve("next/dist/bin/next");

const nextArgs = [nextBin, command, ...extraArgs];
if (!hasPortArg && port) {
  nextArgs.push("-p", port);
}

const child = spawn(process.execPath, nextArgs, {
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Failed to start Next.js:", error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
