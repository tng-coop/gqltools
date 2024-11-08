import {
  test,
  expect,
  _electron as electron,
  ElectronApplication,
  Page,
} from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { homedir } from "os";


// Manual definition of __dirname in an ES module environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the app data directory path (e.g., `~/.config/gqlapps`)
const appDataDirectory = path.join(homedir(), ".config", "gqlapps");

// Go two levels above the current directory
const distDirectory = path.resolve(__dirname, "..", "..", "dist");
const testAppDirectory = path.resolve(
  __dirname,
  "..",
  "..",
  "graphql-ts-example",
);

let electronApp: ElectronApplication;
let window: Page;

const startAppWithConfig = async (configPath: string) => {
  // Delete the app data directory before starting the app
  if (fs.existsSync(appDataDirectory)) {
    fs.rmSync(appDataDirectory, { recursive: true, force: true });
    console.log(`Removed existing app data directory: ${appDataDirectory}`);
  }

  electronApp = await electron.launch({
    args: ["main.js", "--no-sandbox", `--configPath=${configPath}`],
    cwd: distDirectory,
  });

  // Wait for the first BrowserWindow to open and return its Page object
  window = await electronApp.firstWindow();

  // Run the npm command to start the client before launching the Electron app
  execSync("npm run client", { cwd: testAppDirectory, stdio: "ignore" });

  // Initial setup: clear any existing filters and set the correct options
  const filterInput = window.getByPlaceholder("Enter your filter tag");
  await filterInput.fill(""); // Clear any existing filter
  await window.getByLabel("Regex").setChecked(false);
  await window.getByLabel("Request").setChecked(true);
  await window.getByLabel("Response").setChecked(true);
  await window.getByLabel("8080").setChecked(true);
  await window.getByLabel("8081").setChecked(true);
};

test.afterEach(async () => {
  // Close the Electron app after each test is done
  await electronApp.close();
});

test("block all 127.0.0.1 results in zero rows", async () => {
  await startAppWithConfig("../app.config.block-local.json");

  // Apply a filter that would normally return data
  const filterInput = window.getByPlaceholder("Enter your filter tag");
  await filterInput.fill("GetUsers");

  // Verify no rows are returned because 127.0.0.1 access is blocked
  await expect(window.locator("graphql-row")).toHaveCount(0); // Expecting zero rows due to blocked 127.0.0.1 access
});

test("block only port 8080 results in two rows", async () => {
  await startAppWithConfig("../app.config.block-local-8080.json");

  // Apply a filter that would normally return data
  const filterInput = window.getByPlaceholder("Enter your filter tag");
  await filterInput.fill("GetUsers");

  // Verify two rows are returned because only port 8080 is blocked
  await expect(window.locator("graphql-row")).toHaveCount(2); // Expecting two rows since port 8081 is not blocked
});
