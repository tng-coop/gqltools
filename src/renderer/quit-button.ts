import { LitElement, html, css } from "lit";

class QuitButton extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }

    button {
      padding: 8px 16px;
      background-color: var(--quit-button-bg-color, #dc3545); /* Red color */
      color: var(--quit-button-text-color, #ffffff); /* White text */
      border: none;
      border-radius: 4px; /* Rounded edges */
      cursor: pointer;
      margin-right: 10px;
      transition:
        background-color 0.3s ease,
        transform 0.1s ease;
      -webkit-app-region: no-drag;
      outline: none;
    }

    button:hover {
      background-color: var(
        --quit-button-hover-bg-color,
        #c82333
      ); /* Darker red on hover */
    }

    button:active {
      background-color: var(
        --quit-button-active-bg-color,
        #bd2130
      ); /* Even darker red when clicked */
      transform: scale(0.98); /* Slightly shrink when clicked */
    }
  `;

  private _handleClick = (): void => {
    // Use the exposed quitApp method in the preload script
    window.electron.quitApp();
  };

  render() {
    return html`
      <button @click=${this._handleClick}>
        <slot>Quit</slot>
      </button>
    `;
  }
}

customElements.define("quit-button", QuitButton);
