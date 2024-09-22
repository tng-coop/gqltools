import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import "./graphql-row";
import { eventBus } from "./event-bus";
import { repeat } from "lit/directives/repeat.js";
import { FilterChangeEvent } from "./filter-input";

interface GraphQLData {
  jwt: JwtData;
  request: RequestData;
  response?: ResponseData;
  jwtFormatted: string; // Add jwtFormatted property to GraphQLData
}

interface JwtData {
  authorizationHeader: string;
}

interface RequestData {
  requestData: string;
  port: number;
  portDescription: string;
}

interface ResponseData {
  responseData: string;
}

@customElement("graphql-data-container")
export class GraphqlDataContainer extends LitElement {
  @state() graphqlRequests: Record<number, GraphQLData> = {}; // Updated name from 'data' to 'graphqlRequests'
  @state() filterQuery = "";
  @state() filterRegex = false;
  @state() filterJwtFormatted = true; // New state to control filtering based on jwtFormatted
  @state() filterRequest = true;
  @state() filterResponse = true;
  @state() proxyServersEnabled: Record<number, boolean> = {}; // Add state to track enabled proxy servers

  connectedCallback() {
    super.connectedCallback();
    this._addEventListeners(); // Moved event listener setup to connectedCallback
  }

  private _addEventListeners(): void {
    window.electron.onGraphqlDetected((event, data) => {
      this._handleGraphqlDetected({
        requestId: data.requestId,
        requestData: data.request,
        authorizationHeader: data.headers["authorization"],
        port: data.port,
        portDescription: data.portDescription,
      });
    });

    window.electron.onGraphqlResponse((_event, detectedGraphqlRequest) => {
      this._handleGraphqlResponse({
        requestId: detectedGraphqlRequest.requestId,
        response: detectedGraphqlRequest.response,
      });
    });

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
    console.log("Filter change event received in graphql-data-container");
    const {
      filterTag,
      regexEnabled,
      scanRequest,
      scanResponse,
      proxyServersEnabled,
      scanJwtFormatted, // New property for scanning jwtFormatted
    } = event.detail;
    this.filterQuery = filterTag;
    this.filterRegex = regexEnabled;
    this.filterRequest = scanRequest;
    this.filterResponse = scanResponse;
    this.filterJwtFormatted = scanJwtFormatted; // Set the state for jwtFormatted filtering
    this.proxyServersEnabled = proxyServersEnabled;
    console.log(
      `New settings: Regex: ${this.filterRegex}, Query: ${this.filterQuery}, Request: ${this.filterRequest}, Response: ${this.filterResponse}, JWT: ${this.filterJwtFormatted}, Proxy Servers: ${JSON.stringify(this.proxyServersEnabled)}`,
    );
    this.requestUpdate(); // Request update after change
  }

  public clear(): void {
    this.graphqlRequests = {}; // Updated from 'this.data' to 'this.graphqlRequests'
    this.requestUpdate();
  }

  private _handleGraphqlDetected(detectedGraphqlRequest: {
    requestId: number;
    requestData: string;
    authorizationHeader: string;
    port: number;
    portDescription: string;
  }): void {
    const jwtFormatted = JSON.stringify(this.parseJwt(detectedGraphqlRequest.authorizationHeader), null, 2);

    this.graphqlRequests[detectedGraphqlRequest.requestId] = {
      jwt: {
        authorizationHeader: detectedGraphqlRequest.authorizationHeader,
      },
      request: {
        requestData: detectedGraphqlRequest.requestData,
        port: detectedGraphqlRequest.port,
        portDescription: detectedGraphqlRequest.portDescription,
      },
      jwtFormatted, // Store formatted JWT here
    };

    const keys = Object.keys(this.graphqlRequests).map(Number);
    const maxLength = 1000;
    if (keys.length > maxLength) {
      const topKeys = keys.sort((a, b) => b - a).slice(0, maxLength);
      this.graphqlRequests = topKeys.reduce((acc, key) => {
        acc[key] = this.graphqlRequests[key];
        return acc;
      }, {} as typeof this.graphqlRequests);
    }
  }

  private _handleGraphqlResponse(data: {
    requestId: number;
    response: string;
  }): void {
    const existingRequest: GraphQLData | undefined = this.graphqlRequests[data.requestId];

    if (existingRequest) {
      const updatedResponse: ResponseData = { responseData: data.response };
      const updatedRequest: GraphQLData = {
        ...existingRequest,
        response: updatedResponse,
      };

      this.graphqlRequests = {
        ...this.graphqlRequests,
        [data.requestId]: updatedRequest,
      };

      this.requestUpdate();
    }
  }

  private parseJwt(token: string): unknown {
    try {
      const base64Url: string = token.split(".")[1];
      const base64: string = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload: string = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );

      const payload: unknown = JSON.parse(jsonPayload) as unknown;
      return payload;
    } catch {
      return "Invalid JWT";
    }
  }

  render() {
    console.log(
      `filters are: Regex: ${this.filterRegex}, Query: ${this.filterQuery}, JWT: ${this.filterJwtFormatted}, Request: ${this.filterRequest}, Response: ${this.filterResponse}`,
    );
    const regex = this.filterRegex ? new RegExp(this.filterQuery, "i") : null;

    const keys = Object.keys(this.graphqlRequests);
    const numericKeys = keys.map((key) => Number(key)); // Convert keys to numbers
    
    const filteredIds: number[] = [];
    
    for (const requestId of numericKeys) {
      const graphqlData: GraphQLData | undefined = this.graphqlRequests[requestId];
    
      if (!graphqlData) {
        continue; // Skip if there's no data for this requestId
      }
    
      const { jwtFormatted, request, response } = graphqlData;
    
      if (!this.proxyServersEnabled[request.port]) {
        continue; // Skip this request if its port is disabled
      }
    
      const { filterJwtFormatted, filterRequest, filterResponse } = this;
    
      const requestData = request.requestData;
      const responseData = response?.responseData;
    
      if (regex) {
        const matchesJwtFormatted = filterJwtFormatted && regex.test(jwtFormatted);
        const matchesRequest = filterRequest && regex.test(requestData);
        const matchesResponse = filterResponse && responseData ? regex.test(responseData) : false;
    
        if (matchesJwtFormatted || matchesRequest || matchesResponse) {
          filteredIds.push(requestId);
        }
        continue;
      }
    
      const lowerCaseQuery = this.filterQuery.toLowerCase();
    
      const jwtFormattedIncludesQuery = filterJwtFormatted &&
        jwtFormatted.toLowerCase().includes(lowerCaseQuery);
      const requestDataIncludesQuery = filterRequest &&
        request.requestData.toLowerCase().includes(lowerCaseQuery);
      const responseDataIncludesQuery = filterResponse &&
        (response?.responseData?.toLowerCase().includes(lowerCaseQuery) ?? false);
    
      if (jwtFormattedIncludesQuery || requestDataIncludesQuery || responseDataIncludesQuery) {
        filteredIds.push(requestId);
      }
    }
    
    filteredIds.sort((a, b) => b - a);
    
    eventBus.dispatchEvent(
      new CustomEvent("update-requests-in-memory", {
        detail: { count: Object.keys(this.graphqlRequests).length },
      }),
    );

    eventBus.dispatchEvent(
      new CustomEvent("update-requests-on-display", {
        detail: { count: filteredIds.length },
      }),
    );

    return html`
      ${repeat(
        filteredIds,
        (requestId) => {
          const { response } = this.graphqlRequests[requestId];
          return (
            requestId.toString() +
            "-" +
            this.filterQuery +
            "-" +
            this.filterRegex.toString() +
            "-" +
            (response ? response.responseData.length : 0).toString()
          );
        },
        (requestId) => {
          const { jwtFormatted, jwt, request, response } = this.graphqlRequests[requestId];
          return html`
            <graphql-row
              .requestData="${request.requestData || ""}"
              .port="${request.port}"
              .portDescription="${request.portDescription}"
              .responseData="${response?.responseData || ""}"
              .jwtFormatted="${jwtFormatted}"
              .jwtRaw="${jwt.authorizationHeader}"
              .requestId="${requestId}"
              .highlightValue="${this.filterQuery}"
              .isRegex="${this.filterRegex}"
            >${requestId}-${response?.responseData.length ?? 0}</graphql-row>
          `;
        },
      )}
    `;
  }
}
