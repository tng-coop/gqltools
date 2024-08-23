import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, readFileSync, copyFileSync } from "fs";
import { startProxyServers } from "./proxyServer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to parse command-line arguments
function getConfigPathFromArgs(): string | null {
  const args = process.argv.slice(1);
  const configArgIndex = args.findIndex((arg) =>
    arg.startsWith("--configPath="),
  );

  if (configArgIndex !== -1) {
    const configPath = args[configArgIndex].split("=")[1];
    return configPath;
  }

  return null;
}

// Get config path from CLI or default to the current directory
const providedConfigPath = getConfigPathFromArgs();
const configPath = providedConfigPath
  ? providedConfigPath
  : join(__dirname, "../app.config.json");
const sampleConfigPath = join(__dirname, "../app.config.sample.json");
// console.log("Using config file:", configPath);

// Check if app.config.json exists, if not, copy the sample config
if (!existsSync(configPath)) {
  try {
    copyFileSync(sampleConfigPath, configPath);
    // console.log(
    //   "app.config.json did not exist, copied from app.config.sample.json",
    // );
  } catch (error) {
    console.error("Error copying sample config file:", error);
    throw new Error("Failed to copy sample configuration");
  }
}

interface ProxyServerConfig {
  port: number;
  description: string;
}

interface AppConfig {
  proxyServers: ProxyServerConfig[];
}

let config: AppConfig;

try {
  const configFileContent = readFileSync(configPath, "utf-8");
  config = JSON.parse(configFileContent) as AppConfig;
} catch (error) {
  console.error("Error loading config file:", error);
  throw new Error("Failed to load configuration");
}

let win: BrowserWindow | null = null;
let zoomFactor = 1; // Initialize the zoom factor

const createWindow = async () => {
  const preloadPath = join(__dirname, "../dist/preload.js");

  if (!existsSync(preloadPath)) {
    console.error(`Preload script not found at ${preloadPath}`);
    app.quit(); // Terminate the application if preload is missing
    return;
  }

  win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false, // Show the window frame
    resizable: true, // Allow the window to be resizable
    webPreferences: {
      preload: preloadPath, // Reference the compiled CommonJS file
      contextIsolation: true,
      // Pass config through additionalArguments
      additionalArguments: [`--config=${JSON.stringify(config)}`],
    },
  });

  await win.loadFile(join(__dirname, "../src/renderer/index.html"));

  win.on("closed", () => {
    win = null;
  });

  // console.log("Window created and file loaded");
};

(async () => {
  // console.log("App is ready");
  await app.whenReady();

  try {
    await createWindow();
    startProxyServers(config, win); // Pass the BrowserWindow instance to the proxy server
  } catch (error) {
    console.error("Failed to initialize app:", error);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((error) =>
        console.error("Failed to create window on activate:", error),
      );
    }
  });
})().catch((error) => console.error("Error during app initialization:", error));

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

interface WheelEventData {
  deltaY: number;
}

// Handle Ctrl + Wheel events from the renderer process
ipcMain.on("ctrl-wheel", (event, data: WheelEventData) => {
  if (win) {
    // Adjust the zoom factor based on the wheel delta
    zoomFactor += data.deltaY * -0.01; // Adjust the multiplier as needed
    zoomFactor = Math.min(Math.max(0.5, zoomFactor), 3); // Limit zoom between 0.5x and 3x

    // console.log(`Setting zoom factor to: ${zoomFactor}`);
    win.webContents.setZoomFactor(zoomFactor);
  }
});

// Handle the toggle maximize/unmaximize event
ipcMain.on("toggle-maximize", () => {
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on("quit-app", () => {
  app.quit(); // Quits the Electron application
});
