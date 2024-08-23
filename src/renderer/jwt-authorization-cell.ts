import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("jwt-authorization-cell")
export class JwtAuthorizationCell extends LitElement {
  @property({ type: String }) jwt = ""; // Authorization header

  static styles = css`
    .cell {
      padding: 10px;
      cursor: pointer;
      user-select: none;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .cell:hover {
      background-color: #f0f0f0;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.dispatchParsedJwt(); // Dispatch the parsed JWT when the component is connected
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has("jwt")) {
      this.dispatchParsedJwt(); // Dispatch the parsed JWT whenever the jwt property changes
    }
  }

  private copyJwtToClipboard = () => {
    if (this.jwt) {
      const authorizationObject = {
        Authorization: this.jwt,
      };
      const jsonString = JSON.stringify(authorizationObject, null, 2);

      navigator.clipboard.writeText(jsonString).catch((err: unknown) => {
        console.error("Failed to copy authorization header to clipboard:", err);
      });
    }
  };

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

  private dispatchParsedJwt() {
    // if jwt is undefined, return
    if (!this.jwt) {
      return;
    }
    // Extract and decode the JWT if present
    const decodedJwt = this.jwt.startsWith("Bearer ")
      ? this.parseJwt(this.jwt.split(" ")[1])
      : "Invalid Authorization Header";

    // Dispatch a custom event with the decoded JWT payload
    this.dispatchEvent(
      new CustomEvent("processed-authorization-data", {
        detail: decodedJwt,
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    if (this.jwt) {
      const decodedJwt = this.jwt.startsWith("Bearer ")
        ? this.parseJwt(this.jwt.split(" ")[1])
        : "Invalid Authorization Header";

      return html`<div
        data-testid="jwt-container"
        @click="${this.copyJwtToClipboard}"
      >
        ${decodedJwt}
      </div>`;
    } else {
      return html`<div data-testid="jwt-container"></div>`;
    }
  }
}
