import { css } from "lit";

export const baseInputStyles = css`
  #filter-tag-container {
    display: flex;
    justify-content: center;
    margin: 20px 0;
  }

  input {
    padding: 8px;
    margin-right: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    transition:
      border-color 0.3s ease,
      box-shadow 0.3s ease;
    outline: none;
  }

  input:focus {
    border-color: #007bff; /* Blue border on focus */
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25); /* Soft blue shadow on focus */
  }

  input[readonly] {
    background-color: #f8f8f8; /* Light gray background for read-only */
    border-color: #ddd; /* Slightly lighter border */
    color: #666; /* Gray text color */
    cursor: not-allowed; /* Not-allowed cursor to indicate read-only state */
  }

  input[readonly]:focus {
    border-color: #ddd; /* No focus border color change */
    box-shadow: none; /* No focus shadow */
  }
`;
