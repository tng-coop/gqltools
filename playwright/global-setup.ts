import { execSync, spawn, ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import * as fs from "fs";
import { homedir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let graphqlServerProcess: ChildProcess | null = null;

// Define the app data directory path (e.g., `~/.config/gqltools`)
const appDataDirectory = join(homedir(), ".config", "gqltools");

// Function to check if the GraphQL server is running and responds with 401 Unauthorized
async function checkGraphQLServerStatus() {
  let retries = 20; // Maximum number of retries
  let isServerRunning = false;

  // Retry loop to check if the server is running
  while (retries > 0) {
    try {
      const res = await fetch("http://127.0.0.1:4000/graphql"); // Standard GET request to /graphql
      if (res.status === 401) {
        isServerRunning = true;
        break;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {}
    retries--;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (!isServerRunning) {
    console.error("GraphQL server failed to start after retries.");
    process.exit(1); // Exit with an error code if the server is not running or does not return 401
  }
}

// Global setup function to build the project, clean up the app data directory, and start the test server
export async function globalSetup() {
  const parentDirectory = path.resolve(__dirname, "..");

  try {
    // Clean up the app data directory
    if (fs.existsSync(appDataDirectory)) {
      fs.rmSync(appDataDirectory, { recursive: true, force: true });
      console.log(`Removed existing app data directory: ${appDataDirectory}`);
    }

    // Compile TypeScript
    execSync("npm run build", { cwd: parentDirectory, stdio: "ignore" });

    // Start the GraphQL test server as a detached process in its own group
    graphqlServerProcess = spawn("npm", ["run", "start-test-graphql"], {
      cwd: parentDirectory,
      detached: true,
      stdio: "ignore",
    });

    if (graphqlServerProcess.pid) {
      fs.writeFileSync(
        path.join(__dirname, "graphql-server.pid"),
        String(graphqlServerProcess.pid), // Store the actual PID without the minus sign
      );
    }

    await checkGraphQLServerStatus();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error during global setup:", error.message);
    } else {
      console.error("An unknown error occurred during global setup");
    }
    process.exit(1);
  }
}

export default globalSetup;
