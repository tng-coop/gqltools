import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js"; // Import unsafeHTML
import "./json-modal";
import "./jwt-authorization-cell";
import { JsonModal } from "./json-modal";

@customElement("graphql-row")
export class GraphqlRow extends LitElement {
  @property({ type: Number }) requestId?: number;
  @property({ type: Number }) port?: number;
  @property({ type: String }) portDescription?: string;
  @property({ type: String }) requestData = "";
  @property({ type: String }) responseData = "Waiting for response...";
  @property({ type: String }) authorizationHeader = ""; // Authorization header
  @property({ type: String }) parsedJwt = ""; // Decoded JWT or processed data
  @property({ type: String }) filterableText = ""; // Text used for filtering
  @property({ type: String }) operationType = ""; // Type of GraphQL operation (query, mutation, subscription)
  @property({ type: String }) operationName = ""; // Name of the GraphQL operation
  @property({ type: String }) formattedRequestVar = ""; // Formatted request variables
  @property({ type: String }) formattedResponse = ""; // Formatted response
  @property({ type: String }) highlightValue = "type"; // Default value for highlighting
  @property({ type: Boolean }) isRegex = false; // Boolean to indicate if highlightValue is regex

  static styles = css`
    :host {
      display: block;
      margin-bottom: 20px;
    }

    .graphql-row {
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      padding: 10px; /* Add padding for the row */
      border-radius: 8px; /* Round the corners of the row */
      transition: background-color 0.3s ease;
    }

    .graphql-box {
      flex: 1;
      padding: 10px;
      background-color: #f9f9f9;
      white-space: pre-wrap;
      margin: 0 10px;
      transition:
        background-color 0.3s ease,
        transform 0.1s ease;
      cursor: pointer;
    }

    .graphql-box:hover {
      background-color: #f1f1f1;
    }

    .graphql-box:active {
      background-color: #e1e1e1;
      transform: scale(0.98);
    }

    .header-box {
      background-color: #e1f7d5;
    }

    .request-box {
      background-color: #e8f5e9;
    }

    .response-box {
      background-color: #fff3e0;
    }

    .row-query {
      background-color: #d9f2ff; /* Light blue for queries */
    }

    .row-mutation {
      background-color: #ffe6e6; /* Light red for mutations */
    }

    .row-subscription {
      background-color: #fff3cc; /* Light yellow for subscriptions */
    }

    .row-unknown {
      background-color: #f0f0f0; /* Neutral gray for unknown or other types */
    }

    .highlighted-text {
      background-color: yellow;
      font-weight: bold;
      padding: 2px 4px;
      border-radius: 4px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.updateProperties();
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (
      changedProperties.has("port") ||
      changedProperties.has("requestData") ||
      changedProperties.has("responseData") ||
      changedProperties.has("authorizationHeader") ||
      changedProperties.has("requestId") ||
      changedProperties.has("processedAuthorizationData") ||
      changedProperties.has("highlightValue") || // Re-run when highlightValue changes
      changedProperties.has("isRegex") // Re-run when isRegex changes
    ) {
      this.updateProperties();
      this.requestUpdate();
    }
  }

  private updateProperties() {
    const rdstring: string = this.requestData as unknown as string;
    // If blank, return
    if (!rdstring) {
      return;
    }
    const rdparsed = JSON.parse(rdstring) as {
      query: string;
      variables: string;
      operationName: string;
    };

    this.operationType = this.extractOperationType(rdparsed.query);
    this.filterableText =
      `${this.parsedJwt} ${this.requestData} ${this.responseData}`.toLowerCase();
    const rdparsedWithoutQuery = {
      operationName: rdparsed.operationName,
      variables: rdparsed.variables,
    };
    this.formattedRequestVar = JSON.stringify(rdparsedWithoutQuery, null, 2);
    // If blank, return
    if (!this.responseData) {
      this.formattedResponse = "waiting...";
      return;
    }
    const parsedResponse = JSON.parse(this.responseData) as { data?: object };
    let parsedResponse2 = null;
    if (parsedResponse.data) {
      parsedResponse2 = parsedResponse.data;
    } else {
      parsedResponse2 = parsedResponse;
    }
    this.formattedResponse = JSON.stringify(parsedResponse2, null, 2);
    this.parsedJwt = this.parseJwt(this.authorizationHeader);
  }

  private extractOperationType(query: string): string {
    if (query.startsWith("query")) {
      return "query";
    } else if (query.startsWith("mutation")) {
      return "mutation";
    } else if (query.startsWith("subscription")) {
      return "subscription";
    } else {
      return "unknown";
    }
  }

  private highlightText(content: string): string {
    if (!this.highlightValue) {
      return content; // Return the original content if highlightValue is not set
    }

    try {
      const pattern = this.isRegex
        ? new RegExp(this.highlightValue, "gi")
        : new RegExp(this.escapeRegex(this.highlightValue), "gi");

      return content.replace(
        pattern,
        '<span class="highlighted-text">$&</span>' // Wrap matched text in a highlighted span
      );
    } catch {
      // Return original content if regex is invalid
      return content;
    }
  }
  private parseJwt(token: string): string {
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
      return JSON.stringify(payload, null, 2);
    } catch {
      return "Invalid JWT";
    }
  }


  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  render() {
    // Highlight the request and response content based on the regex pattern
    const highlightedRequest = this.highlightText(this.formattedRequestVar);
    const highlightedResponse = this.highlightText(this.formattedResponse);

    // prettier-ignore
    const retval = html`
      <div class="graphql-row row-${this?.operationType || ""}" data-testid="graphql-row" style="display: flex; flex-direction: column;">
        
        <!-- Port description is now above the boxes -->
        <span class="graphql-port" data-testid="graphql-port" style="margin-bottom: 10px;">
          ${this.port} ${this.portDescription}
        </span>
        
        <!-- Box container with horizontal flex layout for JWT, request, response -->
        <div class="graphql-box-container" style="display: flex; flex-direction: row; flex-grow: 1;">
          <jwt-authorization-cell
            class="graphql-box header-box"
            .jwt="${this.parsedJwt || ""}"
            @click="${(event: Event) => this.handleClick(event)}"
            data-column="jwt"
            data-jwt-parsed="${this.parsedJwt}"
            data-jwt-raw="${this.authorizationHeader}"
            style="margin-right: 10px;"
          ></jwt-authorization-cell>
          
          <div
            class="graphql-box request-box"
            @click="${(event: Event) => this.handleClick(event)}"
            data-column="request"
            data-value="${this.requestData}"
            data-testid="request-box"
            style="margin-right: 10px;"
          >${unsafeHTML(highlightedRequest)}</div> <!-- Use unsafeHTML for highlightedRequest -->
  
          <div
            class="graphql-box response-box"
            @click="${(event: Event) => this.handleClick(event)}"
            data-column="response"
            data-value="${this.responseData}"
            data-testid="response-box"
          >${unsafeHTML(highlightedResponse)}</div> <!-- Use unsafeHTML for highlightedResponse -->
        </div>
      </div>
    `;
    return retval;
  }


  private async handleClick(event: Event): Promise<void> {
    const cell = event.currentTarget as HTMLElement;
    const column = cell.dataset.column;

    if (column === "jwt") {
      const jsonModal = document.querySelector("json-modal") as JsonModal;
      if (jsonModal) {
        jsonModal.graphqlJson = false;
        jsonModal.jsonContent = cell.dataset.jwtParsed || "";
        jsonModal.open = true;
        await navigator.clipboard.writeText(cell.dataset.jwtRaw || "");
        jsonModal.requestUpdate();
      }
    }

    if (column === "request" || column === "response") {
      const jsonModal = document.querySelector("json-modal") as JsonModal;
      if (jsonModal) {
        const contentToCopy = cell.dataset.value || "";

        jsonModal.jsonContent = contentToCopy;
        jsonModal.graphqlJson = column === "request"; // Set to true for request column, false for response column
        jsonModal.open = true;

        // Copy graphqlJson to clipboard
        let parsedJson = JSON.parse(contentToCopy) as {
          query?: string;
          variables?: object;
          data?: object;
        };
        let parsedJson2 = null;
        if (column === "request") {
          delete parsedJson["query"];
          parsedJson2 = parsedJson.variables;
        } else {
          if (parsedJson.data) {
            parsedJson2 = parsedJson.data;
          } else {
            parsedJson2 = parsedJson;
          }
        }
        const formattedContent = JSON.stringify(parsedJson2, null, 2);
        await navigator.clipboard.writeText(formattedContent);

        jsonModal.requestUpdate();
      }
    }
  }
}
