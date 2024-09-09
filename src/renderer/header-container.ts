import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("header-container")
export class HeaderContainer extends LitElement {
  static styles = css`

    #header-container {
      -webkit-app-region: drag;
      padding: .5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
      margin: 0;
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
