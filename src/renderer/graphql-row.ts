import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./json-modal";
import "./jwt-authorization-cell";
import { JsonModal } from "./json-modal";

@customElement("graphql-row")
export class GraphqlRow extends LitElement {
  @property({ type: Object }) headerData: Record<string, string> = {};
  @property({ type: Number }) requestId?: number;
  @property({ type: Number }) port?: number;
  @property({ type: String }) portDescription?: string;
  @property({ type: String }) requestData = "";
  @property({ type: String }) responseData = "Waiting for response...";
  @property({ type: String }) authorizationHeader = ""; // Authorization header
  @property({ type: String }) processedAuthorizationData = ""; // Decoded JWT or processed data
  @property({ type: String }) filterableText = ""; // Text used for filtering
  @property({ type: String }) operationType = ""; // Type of GraphQL operation (query, mutation, subscription)
  @property({ type: String }) operationName = ""; // Type of GraphQL operation (query, mutation, subscription)
  @property({ type: String }) formattedRequestVar = ""; // Type of GraphQL operation (query, mutation, subscription)
  @property({ type: String }) formattedResponse = ""; // Type of GraphQL operation (query, mutation, subscription)

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
  `;

  connectedCallback() {
    super.connectedCallback();
    this.updateFilterableText();
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (
      changedProperties.has("port") ||
      changedProperties.has("requestData") ||
      changedProperties.has("responseData") ||
      changedProperties.has("authorizationHeader") ||
      changedProperties.has("requestId") ||
      changedProperties.has("processedAuthorizationData")
    ) {
      this.updateFilterableText();
      this.requestUpdate();
    }
  }

  private updateFilterableText() {
    const rdstring: string = this.requestData as unknown as string;
    //if blank return
    if (!rdstring) {
      return;
    }
    const rdparsed = JSON.parse(rdstring) as unknown as {
      query: string;
      variables: string;
      operationName: string;
    };

    this.operationType = this.extractOperationType(rdparsed.query);
    this.filterableText =
      `${this.processedAuthorizationData} ${this.requestData} ${this.responseData}`.toLowerCase();
    const rdparsedWithoutQuery = {
      operationName: rdparsed.operationName,
      variables: rdparsed.variables,
    };
    this.formattedRequestVar = JSON.stringify(rdparsedWithoutQuery, null, 2);
    // if blank return
    if (!this.responseData) {
      this.formattedResponse = "waiting...";
      return;
    }
    this.formattedResponse = JSON.stringify(
      JSON.parse(this.responseData),
      null,
      2,
    );
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

  render() {
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
            .jwt="${this?.authorizationHeader || ""}"
            @processed-authorization-data="${(event: CustomEvent<string>) =>
              this.handleProcessedAuthorizationData(event)}"
            @click="${(event: Event) => this.handleClick(event)}"
            data-column="header"
            style="margin-right: 10px;"
          ></jwt-authorization-cell>
          
          <div
            class="graphql-box request-box"
            @click="${(event: Event) => this.handleClick(event)}"
            data-column="request"
            data-value="${this.requestData}"
            data-testid="request-box"
            style="margin-right: 10px;"
          >${this.formattedRequestVar}</div>
  
          <div
            class="graphql-box response-box"
            @click="${(event: Event) => this.handleClick(event)}"
            data-column="response"
            data-value="${this.responseData}"
            data-testid="response-box"
          >${this.formattedResponse}</div>
        </div>
      </div>
    `;
    return retval;
  }

  private handleProcessedAuthorizationData(event: CustomEvent<string>) {
    this.processedAuthorizationData = event.detail;
    this.updateFilterableText();
  }

  private async handleClick(event: Event): Promise<void> {
    const cell = event.currentTarget as HTMLElement;
    const column = cell.dataset.column;

    if (column === "request" || column === "response") {
      const jsonModal = document.querySelector("json-modal") as JsonModal;
      if (jsonModal) {
        const contentToCopy = cell.dataset.value || "";

        jsonModal.jsonContent = contentToCopy;
        jsonModal.graphqlJson = column === "request"; // Set to true for request column, false for response column
        jsonModal.open = true;

        // Copy graphqlJson to clipboard
        try {
          let parsedJson = JSON.parse(contentToCopy) as unknown as {
            query?: string;
            variables?: string;
          };
          let parsedJson2 = null;
          if (column === "request") {
            delete parsedJson["query"];
            parsedJson2 = parsedJson.variables;
          } else {
            parsedJson2 = parsedJson;
          }
          const formattedContent = JSON.stringify(parsedJson2, null, 2);
          await navigator.clipboard.writeText(formattedContent);
        } catch (err) {
          console.error("Failed to copy to clipboard: ", err);
        }

        jsonModal.requestUpdate();
      }
    }
  }
}
