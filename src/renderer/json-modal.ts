import { LitElement, html, css, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import Prism from "prismjs";
import "prismjs/components/prism-json"; // Import JSON syntax highlighting
import "prismjs/components/prism-graphql"; // Import GraphQL syntax highlighting
import cssString from "prismjs/themes/prism.css"; // Import Prism Tomorrow theme as a string
import { unsafeHTML } from "lit/directives/unsafe-html.js";

const prismCSS = cssString;

@customElement("json-modal")
export class JsonModal extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: String }) jsonContent = "";
  @property({ type: Boolean }) graphqlJson = false; // Property to toggle between the two display modes

  static styles = [
    css`
      ${unsafeCSS(prismCSS)}
    `, // Use the imported Prism CSS as a string
    css`
      :host {
        position: fixed;
        z-index: 1;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0, 0, 0, 0.5);
      }

      .modal-content {
        background-color: white;
        margin: 15% auto;
        padding: 20px;
        border: 1px solid #888;
        width: 80%;
        max-width: 700px;
        border-radius: 8px;
      }

      .close {
        color: #aaa;
        float: right;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
      }

      .close:hover {
        color: #000;
        text-decoration: none;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("keydown", this._handleKeyDown);
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this._handleKeyDown);
    super.disconnectedCallback();
  }

  render() {
    if (!this.jsonContent) {
      return html`
        <style>
          :host {
            display: ${this.open ? "block" : "none"};
          }
        </style>
        <div class="modal-content"></div>
      `;
    }
    let formattedJsonExcludingQuery = this.jsonContent;
    let formattedQuery = "";
    try {
      const parsedJson = JSON.parse(this.jsonContent) as { query?: unknown };

      if (this.graphqlJson) {
        // Assert that the `query` key does exist
        if ("query" in parsedJson) {
          formattedQuery = parsedJson.query as string;
        } else {
          throw new Error(
            "'query' key is missing in JSON but graphqlJson is true.",
          );
        }
      }

      if (typeof parsedJson === "object" && parsedJson !== null) {
        if ("query" in parsedJson) {
          delete parsedJson["query"];
        }
        formattedJsonExcludingQuery = JSON.stringify(parsedJson, null, 2);
      }
    } catch (error) {
      console.error("Invalid JSON string provided:", error);
    }

    const highlightedJsonExcludingQuery = Prism.highlight(
      formattedJsonExcludingQuery,
      Prism.languages.json,
      "json",
    );
    const highlightedQuery = Prism.highlight(
      formattedQuery,
      Prism.languages.graphql,
      "graphql",
    );

    return html`
      <style>
        :host {
          display: ${this.open ? "block" : "none"};
        }
      </style>
      <div class="modal-content">
        <span class="close" @click="${this._closeModal}">&times;</span>
        <pre><code class="language-json">${unsafeHTML(
          highlightedJsonExcludingQuery,
        )}</code></pre>
        ${this.graphqlJson
          ? html`<pre><code class="language-graphql">${unsafeHTML(
              highlightedQuery,
            )}</code></pre>`
          : null}
      </div>
    `;
  }

  private _closeModal = () => {
    this.open = false;
    this.requestUpdate();
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && this.open) {
      this._closeModal();
    }
  };
}
