import path from "path";
import * as fs from "fs";
import { homedir } from "os";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export function globalTeardown() {
  const graphqlServerPidPath = path.join(__dirname, "graphql-server.pid");
  const appDataDirectory = path.join(homedir(), ".config", "gqltools"); // Define the app data directory

  try {
    // Stop the GraphQL test server
    if (fs.existsSync(graphqlServerPidPath)) {
      const graphqlServerPid = parseInt(
        fs.readFileSync(graphqlServerPidPath, "utf-8"),
        10,
      );
      // console.log(`Stopping GraphQL test server... PID: ${graphqlServerPid}`);

      // Check if the PID is valid and stop the process group
      if (!isNaN(graphqlServerPid) && graphqlServerPid > 0) {
        process.kill(-graphqlServerPid, "SIGTERM"); // Add the minus sign here to target the process group
        // console.log(`Successfully stopped GraphQL test server with PGID: ${graphqlServerPid}`);
      } else {
        console.warn("Invalid PID found in the PID file.");
      }

      fs.unlinkSync(graphqlServerPidPath); // Remove the PID file
    } else {
      console.warn("No GraphQL server PID file found.");
    }

    // Clean up the app data directory
    if (fs.existsSync(appDataDirectory)) {
      fs.rmSync(appDataDirectory, { recursive: true, force: true });
      console.log(`Removed app data directory: ${appDataDirectory}`);
    } else {
      console.warn("App data directory not found, no cleanup necessary.");
    }

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error during global teardown:", error.message);
    } else {
      console.error("An unknown error occurred during global teardown");
    }
  }
}

export default globalTeardown;
