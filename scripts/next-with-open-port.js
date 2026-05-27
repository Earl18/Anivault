const net = require("net");
const { spawn } = require("child_process");
const path = require("path");

const DEFAULT_PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const MAX_PORT = 65535;

function isPortFree(port) {
  return new Promise((resolve) => {
    const tryListen = (host, next) => {
      const server = net.createServer();

      server.once("error", (error) => {
        server.close(() => {
          if (error && error.code === "EAFNOSUPPORT") {
            next();
            return;
          }

          resolve(false);
        });
      });

      server.once("listening", () => {
        server.close(() => next());
      });

      server.listen({
        port,
        host,
        exclusive: true,
      });
    };

    tryListen("::", () => {
      tryListen("0.0.0.0", () => resolve(true));
    });
  });
}

async function findOpenPort(startPort) {
  for (let port = startPort; port <= MAX_PORT; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(port)) {
      return port;
    }
  }

  throw new Error(`No open port found between ${startPort} and ${MAX_PORT}.`);
}

async function main() {
  const mode = process.argv[2] ?? "dev";
  const preferredPort = Number.isInteger(DEFAULT_PORT) ? DEFAULT_PORT : 3000;
  const selectedPort = await findOpenPort(preferredPort);
  const nextBin = require.resolve("next/dist/bin/next");

  if (selectedPort !== preferredPort) {
    console.log(
      `Port ${preferredPort} is busy, starting ${mode} server on port ${selectedPort} instead.`,
    );
  } else {
    console.log(`Starting ${mode} server on port ${selectedPort}.`);
  }

  if (mode === "dev") {
    const child = spawn(
      process.execPath,
      [nextBin, "dev", "-p", String(selectedPort)],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          PORT: String(selectedPort),
        },
      },
    );

    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      process.exit(code ?? 0);
    });

    return;
  }

  if (mode === "start") {
    const child = spawn(process.execPath, [path.join(".next", "standalone", "server.js")], {
      stdio: "inherit",
      env: {
        ...process.env,
        PORT: String(selectedPort),
      },
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      process.exit(code ?? 0);
    });

    return;
  }

  throw new Error(`Unsupported mode "${mode}". Use "dev" or "start".`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
