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
  @state() filterRequest = true;
  @state() filterResponse = true;
  @state() proxyServersEnabled: Record<number, boolean> = {}; // Add state to track enabled proxy servers

  connectedCallback() {
    super.connectedCallback();
    this._addEventListeners(); // Moved event listener setup to connectedCallback
  }

  private _addEventListeners(): void {
    // Listening for events from window.electron (native events)
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
    console.log("Filter change event received in graphql-data-container");
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
    console.log(
      `New settings: Regex: ${this.filterRegex}, Query: ${this.filterQuery}, Request: ${this.filterRequest}, Response: ${this.filterResponse}, Proxy Servers: ${JSON.stringify(this.proxyServersEnabled)}`,
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
    // Add the new data
    this.graphqlRequests[detectedGraphqlRequest.requestId] = {
      jwt: {
        authorizationHeader: detectedGraphqlRequest.authorizationHeader,
      },
      request: {
        requestData: detectedGraphqlRequest.requestData,
        port: detectedGraphqlRequest.port,
        portDescription: detectedGraphqlRequest.portDescription,
      },
    };
  
    // If more than 1000 elements, keep only the top 1000 highest requestIds
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
    // Type-safe access to the existing request data
    const existingRequest: GraphQLData | undefined = this.graphqlRequests[data.requestId]; // Updated from 'this.data' to 'this.graphqlRequests'

    if (existingRequest) {
      const updatedResponse: ResponseData = { responseData: data.response };
      const updatedRequest: GraphQLData = {
        ...existingRequest,
        response: updatedResponse,
      };

      // Update the state with the modified data
      this.graphqlRequests = { // Updated from 'this.data' to 'this.graphqlRequests'
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
      return payload
    } catch {
      return "Invalid JWT";
    }
  }
  render() {
    console.log(
      `filters are: Regex: ${this.filterRegex}, Query: ${this.filterQuery}, Request: ${this.filterRequest}, Response: ${this.filterResponse}`,
    );
    const regex = this.filterRegex ? new RegExp(this.filterQuery, "i") : null;

    const keys = Object.keys(this.graphqlRequests); // Updated from 'this.data' to 'this.graphqlRequests'
    const numericKeys = keys.map((key) => Number(key)); // Convert keys to numbers
    
    const filteredIds: number[] = [];
    
    for (const requestId of numericKeys) {
      const graphqlData: GraphQLData | undefined = this.graphqlRequests[requestId]; // Updated from 'this.data' to 'this.graphqlRequests'
    
      if (!graphqlData) {
        continue; // Skip if there's no data for this requestId
      }
    
      const { request, response } = graphqlData;
    
      // Check if the port is enabled before filtering further
      if (!this.proxyServersEnabled[request.port]) {
        continue; // Skip this request if its port is disabled
      }
    
      // Destructure the filtering options for clarity
      const { filterRequest, filterResponse } = this;
    
      // Type-safe checks for request and response data
      const requestData = request.requestData;
      const responseData = response?.responseData;
    
      // Handle filtering logic using regex if enabled
      if (regex) {
        const matchesRequest = filterRequest && regex.test(requestData);
        const matchesResponse = filterResponse && responseData ? regex.test(responseData) : false;
    
        if (matchesRequest || matchesResponse) {
          filteredIds.push(requestId);
        }
        continue;
      }
    
      // Fallback to simple includes method based on filterRequest and filterResponse flags
      const lowerCaseQuery = this.filterQuery.toLowerCase();
    
      // Extract and lowercase the request data for comparison
      const requestDataIncludesQuery = filterRequest &&
        request.requestData.toLowerCase().includes(lowerCaseQuery);
    
      // Check if response data exists and includes the query
      const responseDataIncludesQuery = filterResponse &&
        (response?.responseData?.toLowerCase().includes(lowerCaseQuery) ?? false);
    
      // Return whether the query is found in either the request or response data
      if (requestDataIncludesQuery || responseDataIncludesQuery) {
        filteredIds.push(requestId);
      }
    }
    
    // Sort the filteredIds in descending order
    filteredIds.sort((a, b) => b - a);
    
    // Dispatch the event to update the number of requests in memory
    eventBus.dispatchEvent(
      new CustomEvent("update-requests-in-memory", {
        detail: { count: Object.keys(this.graphqlRequests).length }, // Updated from 'this.data' to 'this.graphqlRequests'
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
        const { response } = this.graphqlRequests[requestId]; // Updated from 'this.data' to 'this.graphqlRequests'
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
        const { jwt, request, response } = this.graphqlRequests[requestId]; // Updated from 'this.data' to 'this.graphqlRequests'

        const jwtFormatted= JSON.stringify(this.parseJwt(jwt.authorizationHeader), null, 2);
        const jwtRaw= jwt.authorizationHeader
        return html`
            <graphql-row
              .requestData="${request.requestData || ""}"
              .port="${request.port}"
              .portDescription="${request.portDescription}"
              .responseData="${response?.responseData || ""}"
              .jwtFormatted="${jwtFormatted}"
              .jwtRaw="${jwtRaw}"
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
