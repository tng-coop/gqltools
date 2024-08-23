import { LitElement, html, css } from "lit";

class ToggleButton extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      margin-left: auto; /* Ensure the button is aligned to the far right */
    }

    button {
      padding: 8px 16px;
      background-color: #28a745; /* Green color */
      color: #fff;
      border: none;
      border-radius: 4px; /* Rounded edges */
      cursor: pointer;
      transition:
        background-color 0.3s ease,
        transform 0.1s ease;
      outline: none;
      -webkit-app-region: no-drag;
    }

    button:hover {
      background-color: #218838; /* Darker green on hover */
    }

    button:active {
      background-color: #1e7e34; /* Even darker green when clicked */
      transform: scale(0.98); /* Slightly shrink when clicked */
    }
  `;

  // Handle click within the component
  private _handleClick(): void {
    window.electron.toggleMaximize(); // Directly call the toggleMaximize function
  }

  render() {
    return html`
      <button @click=${() => this._handleClick()} title="Toggle Fullscreen">
        ⛶
      </button>
    `;
  }
}

customElements.define("toggle-button", ToggleButton);
