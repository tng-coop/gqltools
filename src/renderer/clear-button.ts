import { LitElement, html, css } from "lit";
import { eventBus } from "./event-bus";
class ClearButton extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }

    button {
      padding: 8px 16px;
      background-color: var(--clear-button-bg-color, #dc3545); /* Red color */
      color: var(--clear-button-text-color, #ffffff); /* White text */
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
        --clear-button-hover-bg-color,
        #c82333
      ); /* Darker red on hover */
    }

    button:active {
      background-color: var(
        --clear-button-active-bg-color,
        #bd2130
      ); /* Even darker red when clicked */
      transform: scale(0.98); /* Slightly shrink when clicked */
    }
  `;

  // Use an arrow function to ensure `this` is correctly scoped
  private _handleClick = (): void => {
    // console.log("about to fire clear-data event");
    eventBus.dispatchEvent(new CustomEvent("clear-data"));
  };

  render() {
    return html`
      <button @click=${this._handleClick}>
        <slot>Clear All</slot>
      </button>
    `;
  }
}

customElements.define("clear-button", ClearButton);
