export {};

declare global {
  interface Window {
    electron: {
      quitApp: () => void;
      getConfig: () => AppConfig;
      toggleMaximize: () => void;
      onCtrlWheel: (
        callback: ({
          deltaX,
          deltaY,
        }: {
          deltaX: number;
          deltaY: number;
        }) => void,
      ) => void;
      onGraphqlDetected: (
        callback: (
          event: Event,
          data: {
            requestId: number;
            request: string;
            headers: Record<string, string>;
            port: number;
            portDescription: string;
          },
        ) => void,
      ) => void;
      onGraphqlResponse: (
        callback: (
          event: Event,
          data: {
            requestId: number;
            response: string;
            port: number;
            portDescription: string;
          },
        ) => void,
      ) => void;
      // Add other methods exposed via contextBridge here
    };
  }
}
