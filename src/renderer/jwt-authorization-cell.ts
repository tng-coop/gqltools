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


  render() {
    return html`<div data-testid="jwt-container">${this.jwt}</div>`;
  }
}
