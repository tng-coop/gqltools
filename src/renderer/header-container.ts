import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("header-container")
export class HeaderContainer extends LitElement {
  static styles = css`
    :host {
      --padding-medium: 0.625rem; /* 10px */
      --color-header-bg: #333;
      --color-header-text: #fff;
      --color-button-bg: #555;
      --color-button-bg-hover: #777;
    }

    #header-container {
      -webkit-app-region: drag;
      background-color: var(--color-header-bg);
      color: var(--color-header-text);
      padding: var(--padding-medium);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    button {
      -webkit-app-region: no-drag;
      background-color: var(--color-button-bg);
      color: var(--color-header-text);
      border: none;
      padding: var(--padding-small) var(--padding-medium);
      cursor: pointer;
    }

    button:hover {
      background-color: var(--color-button-bg-hover);
    }

    h1 {
      margin: 0;
      text-align: center;
      flex-grow: 1;
    }

    .centered-content {
      flex-grow: 1;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  `;

  render() {
    return html`
      <div id="header-container">
        <clear-button></clear-button>
        <div class="centered-content">
          <h1>GraphQL Monitor</h1>
        </div>
        <div id="control-buttons">
          <quit-button></quit-button>
          <toggle-button></toggle-button>
        </div>
      </div>
    `;
  }
}
