import http from "http";
import https from "https";
import { parse } from "url";
import { IncomingMessage, ServerResponse } from "http";
import { BrowserWindow } from "electron";
import zlib from "zlib"; // Import zlib for decompression
import WebSocket, { RawData } from "ws"; // Import WebSocket and RawData type
import net from "net"; // Import net for handling CONNECT requests

let requestCounter = 0; // Initialize a counter

interface ProxyServerConfig {
  port: number;
  description: string;
  blockedUrls?: string[]; // Optional array of regex patterns as strings
}

// Abstract function to check if a URL should be blocked
const isUrlBlocked = (
  url: string | undefined,
  blockedUrlsRegex: RegExp[],
): boolean => {
  if (!url || !blockedUrlsRegex) return false;
  return blockedUrlsRegex.some((regex) => regex.test(url));
};

const createProxyServer = (
  serverConfig: ProxyServerConfig,
  win: BrowserWindow | null,
): void => {
  const { port, description: portDescription, blockedUrls } = serverConfig;
  let blockedUrlsRegex: RegExp[];
  if (blockedUrls) {
    blockedUrlsRegex = blockedUrls.map((regex) => new RegExp(regex));
  } else {
    blockedUrlsRegex = [];
  }
  const server = http.createServer(
    (clientReq: IncomingMessage, clientRes: ServerResponse) => {
      const parsedUrl = parse(clientReq.url || "");

      if (!parsedUrl.hostname) {
        clientRes.statusCode = 400;
        clientRes.end("Bad Request: Invalid URL");
        return;
      }

      const isHttps = parsedUrl.protocol === "https:";
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.path,
        method: clientReq.method,
        headers: clientReq.headers,
      };

      const requestId = ++requestCounter; // Generate a unique ID for each request

      // Use the abstracted blocking logic here
      if (isUrlBlocked(clientReq.url, blockedUrlsRegex)) {
        clientRes.statusCode = 403;
        clientRes.end("Access to this URL is blocked.");
        return; // Stop further processing if the URL is blocked
      }

      if (clientReq.url && clientReq.url.includes("graphql")) {
        let requestBody = "";
        clientReq.on("data", (chunk: Buffer) => {
          requestBody += chunk.toString(); // Safely convert chunk to string
        });

        clientReq.on("end", () => {
          const requestData = {
            requestId,
            url: clientReq.url || "",
            headers: clientReq.headers, // Capture request headers
            request: requestBody,
            port,
            portDescription,
          };

          if (win) {
            if (requestData.request) {
              win.webContents.send("graphql-detected", requestData);
            }
          }

          const proxyReq = (isHttps ? https : http).request(
            options,
            (proxyRes: IncomingMessage) => {
              clientRes.writeHead(proxyRes.statusCode || 500, proxyRes.headers);

              let responseBody: Buffer[] = [];

              proxyRes.on("data", (chunk: Buffer) => {
                responseBody.push(chunk); // Capture response body as Buffer
              });

              proxyRes.on("end", () => {
                const buffer = Buffer.concat(responseBody);

                // Forward the original response directly to the client
                clientRes.end(buffer);

                // Decompress for inspection, but do not modify what goes to the client
                if (proxyRes.headers["content-encoding"] === "gzip") {
                  zlib.gunzip(buffer, (err, decoded) => {
                    if (err) {
                      return;
                    }

                    const responseData = {
                      requestId,
                      response: decoded.toString(),
                    };

                    if (win) {
                      win.webContents.send("graphql-response", responseData);
                    }
                  });
                } else {
                  const responseData = {
                    requestId,
                    response: buffer.toString(),
                  };

                  if (win) {
                    win.webContents.send("graphql-response", responseData);
                  }
                }
              });
            },
          );

          proxyReq.on("error", (err: Error) => {
            // Log detailed error information
            console.error(
              `Error during proxy request to ${options.hostname}:${options.port}${options.path}`,
              `\nMethod: ${options.method}`,
              `\nHeaders: ${JSON.stringify(options.headers, null, 2)}`,
              `\nError message: ${err.message}`,
              `\nStack trace: ${err.stack || "No stack trace available"}`,
            );

            // Send a detailed error response back to the client
            clientRes.statusCode = 502;
            clientRes.setHeader("Content-Type", "application/json"); // Set response type to JSON for better error formatting
            clientRes.end(
              JSON.stringify(
                {
                  error: "Bad Gateway1",
                  message: "Error forwarding request",
                  details: err.message, // Include the error message in the response
                  hostname: options.hostname,
                  port: options.port,
                  path: options.path,
                  method: options.method,
                },
                null,
                2,
              ),
            );
          });

          proxyReq.write(requestBody);
          proxyReq.end();
        });
      } else {
        const proxyReq = (isHttps ? https : http).request(
          options,
          (proxyRes: IncomingMessage) => {
            clientRes.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
            proxyRes.pipe(clientRes, { end: true });
          },
        );

        proxyReq.on("error", (err: Error) => {
          console.error(
            `Error during proxy request to ${options.hostname}:`,
            err.message,
          );
          clientRes.statusCode = 502;
          clientRes.end("Bad Gateway2: Error forwarding request");
        });

        clientReq.pipe(proxyReq, { end: true });
      }
    },
  );

  // Handle HTTPS CONNECT requests
  server.on(
    "connect",
    (req: IncomingMessage, clientSocket: net.Socket, head: Buffer) => {
      const { port, hostname } = parse(`https://${req.url}`);

      // Use the abstracted blocking logic here
      if (isUrlBlocked(req.url, blockedUrlsRegex)) {
        logWithCount(`Blocked CONNECT to URL: ${req.url}`);
        clientSocket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
        return; // Stop further processing if the URL is blocked
      }

      const serverSocket = net.connect(
        Number(port) || 443,
        hostname || "",
        () => {
          clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
          serverSocket.write(head);
          serverSocket.pipe(clientSocket);
          clientSocket.pipe(serverSocket);
        },
      );

      serverSocket.on("error", () => {
        clientSocket.end("HTTP/1.1 502 Bad Gateway\r\n\r\n");
      });

      clientSocket.on("error", () => {
        serverSocket.end();
      });

      serverSocket.on("close", () => {
        clientSocket.end();
      });

      clientSocket.on("close", () => {
        serverSocket.end();
      });
    },
  );

  // Handle WebSocket upgrades
  server.on(
    "upgrade",
    (req: IncomingMessage, socket: net.Socket, head: Buffer) => {
      const wsServer = new WebSocket.Server({ noServer: true });
      wsServer.handleUpgrade(req, socket, head, (ws) => {
        ws.on("message", (message: RawData) => {
          const messageString =
            message instanceof Buffer ? message.toString() : String(message);
          ws.send(`Echo: ${messageString}`);
        });

        ws.on("close", () => {
          // Connection closed, no action required.
        });

        ws.on("error", (error) => {
          console.error("WebSocket error:", error);
        });
      });
    },
  );

  server.listen(port, "127.0.0.1", () => {
    // console.log(
    //   `HTTP/HTTPS Proxy server (${portDescription}) with WebSocket support started on http://127.0.0.1:${port}`,
    // );
  });

  server.on("error", (err: Error) => {
    console.error(
      `Failed to start proxy server (${portDescription}):`,
      err.message,
    );
  });
};

export const startProxyServers = (
  config: { proxyServers: ProxyServerConfig[] },
  win: BrowserWindow | null,
): void => {
  if (config && config.proxyServers) {
    config.proxyServers.forEach((serverConfig) => {
      createProxyServer(serverConfig, win);
      // console.log(
      //   `Started ${serverConfig.description} on port ${serverConfig.port}`,
      // );
    });
  } else {
    console.error("Proxy server configuration is missing or invalid.");
  }
};

const logWithCount = (() => {
  let lastMessage = "";
  let lastCount = 0;
  let isRepeating = false;

  return (...args: unknown[]): void => {
    const message = args.join(" ");

    if (message === lastMessage) {
      lastCount++;
      process.stdout.write(`\r[Repeated ${lastCount} times] ${message}`);
      isRepeating = true;
    } else {
      if (isRepeating) {
        // Ensure a newline before logging a different message
        // console.log();
      }
      lastMessage = message;
      lastCount = 1;
      // console.log(message); // New message, print on a new line
      isRepeating = false;
    }
  };
})();
