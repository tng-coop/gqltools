import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import "./graphql-row";
import { eventBus } from "./event-bus";
import { repeat } from "lit/directives/repeat.js";
import { FilterChangeEvent } from "./filter-input";

interface HeaderData {
  user_id: string;
  role: string;
  account_id: string;
}

interface GraphQLData {
  jwt: {
    headerData: HeaderData;
    authorizationHeader: string;
  };
  request: {
    requestData: string;
    port: number;
    portDescription: string;
  };
  response?: {
    responseData: string;
  };
}

interface ProxyServerConfig {
  port: number;
  description: string;
}

interface AppConfig {
  proxyServers: ProxyServerConfig[];
}

@customElement("graphql-data-container")
export class GraphqlDataContainer extends LitElement {
  @state() data: Record<number, GraphQLData> = {};
  @state() filterQuery = "";
  @state() filterRegex = false;
  @state() filterRequest = true;
  @state() filterResponse = true;
  @state() proxyServersEnabled: Record<number, boolean> = {}; // Add state to track enabled proxy servers

  constructor() {
    super();

    // Access the config from the main process at the beginning
    const config: AppConfig = window.electron.getConfig();
    // console.log("Config received in renderer:", config);

    // Initialize proxy server states (enabled/disabled) based on the config and localStorage
    if (config) {
      config.proxyServers.forEach((server: ProxyServerConfig) => {
        const storedState: string | null = localStorage.getItem(
          `proxy-enabled-${server.port}`,
        );
        // Set default to true if there's no stored state
        this.proxyServersEnabled = {
          ...this.proxyServersEnabled,
          [server.port]: storedState
            ? (JSON.parse(storedState) as boolean)
            : true,
        };
      });
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._addEventListeners(); // Moved event listener setup to connectedCallback
  }

  private _addEventListeners(): void {
    // Listening for events from window.electron (native events)
    window.electron.onGraphqlDetected((event, data) => {
      this._handleGraphqlDetected({
        requestId: data.requestId,
        headerData: {
          user_id: "N/A",
          role: "N/A",
          account_id: "N/A",
        },
        requestData: data.request,
        authorizationHeader: data.headers["authorization"],
        port: data.port,
        portDescription: data.portDescription,
      });
    });

    window.electron.onGraphqlResponse((event, data) => {
      this._handleGraphqlResponse({
        requestId: data.requestId,
        response: data.response,
      });
    });

    // Listening for events via the event bus
    eventBus.addEventListener(
      "clear-data",
      this.clear.bind(this) as EventListener,
    );
    eventBus.addEventListener(
      "filter-change",
      this._handleFilterChange.bind(this) as EventListener,
    );
  }

  private _handleFilterChange(event: FilterChangeEvent): void {
    // Access the correctly typed detail object
    const {
      filterTag,
      regexEnabled,
      scanRequest,
      scanResponse,
      proxyServersEnabled,
    } = event.detail; // Include proxyServersEnabled from event
    // Now you can use `filterTag` and `regexEnabled` with confidence
    this.filterQuery = filterTag; // Correctly assign filterTag to filterQuery
    this.filterRegex = regexEnabled; // Correctly assign regexEnabled to filterRegex
    this.filterRequest = scanRequest; // Correctly assign scanRequest to filterRequest
    this.filterResponse = scanResponse; // Correctly assign scanResponse to filterResponse
    this.proxyServersEnabled = proxyServersEnabled; // Set the state for enabled/disabled proxy servers
    // console.log(
    //   `New settings: Regex: ${this.filterRegex}, Query: ${this.filterQuery}, Request: ${this.filterRequest}, Response: ${this.filterResponse}, Proxy Servers: ${JSON.stringify(this.proxyServersEnabled)}`,
    // );
    this.requestUpdate(); // Request update after change
  }

  public clear(): void {
    this.data = {};
    this.requestUpdate();
  }

  private _handleGraphqlDetected(data: {
    requestId: number;
    headerData: HeaderData;
    requestData: string;
    authorizationHeader: string;
    port: number;
    portDescription: string;
  }): void {
    this.data = {
      ...this.data,
      [data.requestId]: {
        jwt: {
          headerData: data.headerData,
          authorizationHeader: data.authorizationHeader,
        },
        request: {
          requestData: data.requestData,
          port: data.port,
          portDescription: data.portDescription,
        },
      },
    };
  }

  private _handleGraphqlResponse(data: {
    requestId: number;
    response: string;
  }): void {
    if (this.data[data.requestId]) {
      this.data = {
        ...this.data,
        [data.requestId]: {
          ...this.data[data.requestId],
          response: {
            responseData: data.response,
          },
        },
      };
      this.requestUpdate();
    }
  }

  render() {
    // console.log(
    //   `filters are: Regex: ${this.filterRegex}, Query: ${this.filterQuery}, Request: ${this.filterRequest}, Response: ${this.filterResponse}`,
    // );
    const regex = this.filterRegex ? new RegExp(this.filterQuery, "i") : null;

    const filteredIds = Object.keys(this.data)
      .map(Number)
      .filter((requestId) => {
        const { request, response } = this.data[requestId];

        // Check if the port is enabled before filtering further
        if (!this.proxyServersEnabled[request.port]) {
          return false; // Skip this request if its port is disabled
        }

        if (regex) {
          // Use regex for filtering based on filterRequest and filterResponse flags
          return (
            (this.filterRequest && regex.test(request.requestData)) ||
            (this.filterResponse &&
              response?.responseData &&
              regex.test(response.responseData))
          );
        }

        // Fallback to simple includes method based on filterRequest and filterResponse flags
        const lowerCaseQuery = this.filterQuery.toLowerCase();
        return (
          (this.filterRequest &&
            request.requestData.toLowerCase().includes(lowerCaseQuery)) ||
          (this.filterResponse &&
            (response?.responseData?.toLowerCase().includes(lowerCaseQuery) ??
              false))
        );
      })
      .sort((a, b) => b - a);

    // Dispatch the event to update the number of requests in memory
    eventBus.dispatchEvent(
      new CustomEvent("update-requests-in-memory", {
        detail: { count: Object.keys(this.data).length },
      }),
    );

    // Dispatch the event to update the number of requests on display
    eventBus.dispatchEvent(
      new CustomEvent("update-requests-on-display", {
        detail: { count: filteredIds.length },
      }),
    );

    return html`
      ${repeat(
        filteredIds,
        (requestId) => {
          const { response } = this.data[requestId];
          return (
            requestId.toString() +
            "-" +
            (response ? response.responseData.length : 0).toString()
          );
        },
        (requestId) => {
          const { jwt, request, response } = this.data[requestId];
          return html`
            <graphql-row
              .headerData="${jwt.headerData || ""}"
              .requestData="${request.requestData || ""}"
              .port="${request.port}"
              .portDescription="${request.portDescription}"
              .responseData="${response?.responseData || ""}"
              .authorizationHeader="${jwt.authorizationHeader || ""}"
              .requestId="${requestId}"
              >${requestId}-${response?.responseData.length ?? 0}</graphql-row
            >
          `;
        },
      )}
    `;
  }
}
