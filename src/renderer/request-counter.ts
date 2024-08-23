import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import { baseInputStyles } from "./shared-styles"; // Adjust the path as necessary
import { css } from "lit";
import { eventBus } from "./event-bus"; // Import the event bus

class RequestCounter extends LitElement {
  static styles = [
    baseInputStyles,
    css`
      * {
        width: 6rem;
        text-align: center;
      }
    `,
  ];

  @property({ type: Number }) requestsInMemory = 0;
  @property({ type: Number }) requestsOnDisplay = 0;

  constructor() {
    super();
    this._addEventListeners();
  }

  private _addEventListeners(): void {
    eventBus.addEventListener(
      "update-requests-in-memory",
      this._handleUpdateRequestsInMemory.bind(this) as EventListener,
    );

    eventBus.addEventListener(
      "update-requests-on-display",
      this._handleUpdateRequestsOnDisplay.bind(this) as EventListener,
    );
  }

  private _handleUpdateRequestsInMemory(event: CustomEvent<{ count: number }>) {
    this.requestsInMemory = event.detail.count;
    this.requestUpdate();
  }

  private _handleUpdateRequestsOnDisplay(
    event: CustomEvent<{ count: number }>,
  ) {
    this.requestsOnDisplay = event.detail.count;
    this.requestUpdate();
  }

  render() {
    return html`
      <div id="request-counter">
        <input
          id="requests-counter"
          type="text"
          .value=${`${this.requestsOnDisplay} / ${this.requestsInMemory}`}
          readonly
        />
      </div>
    `;
  }
}

customElements.define("request-counter", RequestCounter);
