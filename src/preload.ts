const { contextBridge, ipcRenderer } = require('electron');
import type { IpcRendererEvent } from 'electron'; // Import the type

interface ProxyServerConfig {
  port: number;
  description: string;
}

interface AppConfig {
  proxyServers: ProxyServerConfig[];
}

// Parse the config passed via additionalArguments
const configArg = process.argv.find((arg) => arg.startsWith("--config="));
let config: AppConfig | null = null;

if (configArg) {
  try {
    // Safely parse the config argument and cast it to AppConfig
    config = JSON.parse(configArg.split("=")[1]) as AppConfig;
  } catch (error) {
    console.error("Failed to parse config:", error);
  }
}

// Default empty config to ensure type safety if no config is passed
const defaultConfig: AppConfig = {
  proxyServers: [],
};

// Use the parsed config if available, otherwise fall back to the default
const finalConfig: AppConfig = config || defaultConfig;

interface proxyRequest {
  requestId: number;
  response: string;
  port: number;
  portDescription: string;
}

contextBridge.exposeInMainWorld("electron", {
  toggleMaximize: () => {
    ipcRenderer.send("toggle-maximize");
  },

  quitApp: () => {
    ipcRenderer.send("quit-app"); // Send the quit signal to the main process
  },

  // Expose the configuration to the renderer
  getConfig: (): AppConfig => finalConfig,

  // GraphQL request handler
  onGraphqlDetected: (
    callback: (
      event: IpcRendererEvent, // Correctly reference the imported IpcRendererEvent
      data: { requestId: number; url: string; request: string }
    ) => void,
  ) => {
    ipcRenderer.on("graphql-detected", (event: IpcRendererEvent, data: unknown) => {
      if (
        typeof data === "object" &&
        data !== null &&
        "requestId" in data &&
        "url" in data &&
        "request" in data
      ) {
        callback(
          event,
          data as { requestId: number; url: string; request: string },
        );
      } else {
        console.error("Received invalid graphql-detected data:", data);
      }
    });
  },

  // GraphQL response handler
  onGraphqlResponse: (
    callback: (
      event: IpcRendererEvent, // Correctly reference the imported IpcRendererEvent
      data: proxyRequest,
    ) => void,
  ) => {
    ipcRenderer.on("graphql-response", (event: IpcRendererEvent, data: unknown) => {
      if (
        typeof data === "object" &&
        data !== null &&
        "requestId" in data &&
        "response" in data
      ) {
        callback(
          event,
          data as proxyRequest,
        );
      } else {
        console.error("Received invalid graphql-response data:", data);
      }
    });
  },

  // Ctrl + Wheel handler
  onCtrlWheel: (
    callback: (data: { deltaX: number; deltaY: number }) => void,
  ) => {
    window.addEventListener("wheel", (event) => {
      if (event.ctrlKey) {
        ipcRenderer.send("ctrl-wheel", {
          deltaX: event.deltaX,
          deltaY: event.deltaY,
        });

        // Call the callback with the event data
        callback({ deltaX: event.deltaX, deltaY: event.deltaY });
      }
    });
  },
});
