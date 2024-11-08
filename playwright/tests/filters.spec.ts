import {
  test,
  expect,
  _electron as electron,
  ElectronApplication,
  Page,
} from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Manual definition of __dirname in an ES module environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Go two levels above the current directory
const distDirectory = path.resolve(__dirname, "..", "..", "dist");
const testAppDirectory = path.resolve(
  __dirname,
  "..",
  "..",
  "graphql-ts-example",
);

let electronApp: ElectronApplication;
let window: Page;
test.beforeAll(async () => {
  // Launch the Electron app with your main entry point (main.js or other file)
  electronApp = await electron.launch({
    args: ["main.js", "--no-sandbox"],
    cwd: distDirectory,
  });

  // Optional: Check if the Electron app is running in packaged mode
  const isPackaged = await electronApp.evaluate(({ app }) => app.isPackaged);
  expect(isPackaged).toBe(false);

  // Wait for the first BrowserWindow to open and return its Page object
  window = await electronApp.firstWindow();

  // Run the npm command to start the client before launching the Electron app
  execSync("npm run client", { cwd: testAppDirectory, stdio: "ignore" });
});

test.afterAll(async () => {
  // Close the Electron app after all tests are done
  await electronApp.close();
});

test.beforeEach(async () => {
  await window.getByPlaceholder("Enter your filter tag").fill("");
  await window.getByLabel("Regex").setChecked(false);
  await window.getByLabel("Request").setChecked(true);
  await window.getByLabel("Response").setChecked(true);
  await window.getByLabel("8080").setChecked(true);
  await window.getByLabel("8081").setChecked(true);
});

test("verify initial data loading", async () => {
  await expect(window.locator("#requests-counter")).toHaveValue("6 / 6");

  const jsonTxt1 = await window
    .locator("graphql-row")
    .nth(0)
    .getByTestId("jwt-box")
    .textContent();
  const jsonTxt2 = await window
    .locator("graphql-row")
    .nth(0)
    .getByTestId("request-box")
    .textContent();
  const jsonTxt3 = await window
    .locator("graphql-row")
    .nth(0)
    .getByTestId("response-box")
    .textContent();
  if (jsonTxt1 === null || jsonTxt2 === null || jsonTxt3 === null) {
    throw new Error("Could not find the JSON content");
  }
  const json1 = JSON.parse(jsonTxt1) as {
    username: string;
    iat: number;
    exp: number;
  };

  const json2 = JSON.parse(jsonTxt2) as {
    operationName: string;
  };

  const json3 = JSON.parse(jsonTxt3) as {
      users: {
        id: string;
        name: string;
      }[];
  };
  // console.log(jsonTxt1)
  expect(json1.username).toBe("admin");
  expect(json2.operationName).toBe("GetUsers");
  expect(json3.users[0].name).toBe("Alice");
});

test("verify default view displays all data", async () => {
  await expect(window.locator("graphql-row")).toHaveCount(6); // Adjust based on your data
});

test("verify JWT popup", async () => {
  await expect(window.locator("graphql-row")).toHaveCount(6); // Adjust based on your data
  await window.getByTestId('jwt-box').nth(0).click();
  // Use Electron's clipboard module to check the clipboard content
  const clipboardText = await electronApp.evaluate(({ clipboard }: { clipboard: Electron.Clipboard }) => {
    return clipboard.readText();
});
  expect(clipboardText).toContain("Bearer eyJ");
  await expect(window.getByText('×')).toBeVisible();
  await window.getByText('×').click();
  await expect(window.getByText('×')).not.toBeVisible();
});

test("verify request popup", async () => {
  await window.getByPlaceholder("Enter your filter tag").fill("CreateUser");
  await expect(window.locator("graphql-row")).toHaveCount(2); // Adjust based on your data
  await expect(window.getByText('mutation CreateUser')).toHaveCount(0);
  await window.getByTestId('request-box').nth(0).click();
  // Use Electron's clipboard module to check the clipboard content
  const clipboardText = await electronApp.evaluate(({ clipboard }) => {
    return clipboard.readText();
  });
  expect(clipboardText).toContain("Paul");
  await expect(window.getByText('mutation CreateUser')).toBeVisible();
  await window.keyboard.press('Escape');
  await expect(window.getByText('mutation CreateUser')).not.toBeVisible();
});

test("verify response popup", async () => {
  await window.getByTestId('response-box').nth(0).click();
  const clipboardText = await electronApp.evaluate(({ clipboard }) => {
    return clipboard.readText();
  });
  expect(clipboardText).toContain("Bob");
  await expect(window.getByText('×')).toBeVisible();
  await window.getByText('×').click();
  await expect(window.getByText('×')).not.toBeVisible();
});

test("filter using regex pattern to display all data", async () => {
  await window.getByPlaceholder("Enter your filter tag").fill(".*");
  await window.getByLabel("Regex").setChecked(true);
  await expect(window.locator("graphql-row")).toHaveCount(6); // Adjust based on your data
});

test("filter without regex to show no data", async () => {
  await window.getByPlaceholder("Enter your filter tag").fill(".*");
  await window.getByLabel("Regex").setChecked(false);
  await expect(window.locator("graphql-row")).toHaveCount(0); // Adjust based on your data
});

test("disable request filter to show no matching data", async () => {
  await window.getByPlaceholder("Enter your filter tag").fill("Get");
  await window.getByLabel("Request").setChecked(false);
  await expect(window.locator("graphql-row")).toHaveCount(0); // Adjust based on your data
});

test("enable request filter to show matching data", async () => {
  await window.getByPlaceholder("Enter your filter tag").fill("Get");
  await window.getByLabel("Request").setChecked(true);
  await expect(window.locator("graphql-row")).toHaveCount(4); // Adjust based on your data
});

test("disable response filter to show no matching data", async () => {
  await window.getByPlaceholder("Enter your filter tag").fill("Alice");
  await window.getByLabel("Response").setChecked(false);
  await expect(window.locator("graphql-row")).toHaveCount(0); // Adjust based on your data
});

test("enable response filter to show matching data", async () => {
  await window.getByPlaceholder("Enter your filter tag").fill("Alice");
  await window.getByLabel("Response").setChecked(true);
  await expect(window.locator("graphql-row")).toHaveCount(4); // Adjust based on your data
});

test("filter by specific request name and validate results", async () => {
  const filterInput = window.getByPlaceholder("Enter your filter tag");
  await filterInput.click();
  await filterInput.fill("GetUsers"); // Apply 'GetUsers' filter

  await expect(window.locator("graphql-row")).toHaveCount(4); // Expecting 5 rows with 'GetUsers'

  const jsonTxt2 = await window
    .locator("graphql-row")
    .nth(0)
    .getByTestId("request-box")
    .textContent();
  const jsonTxt3 = await window
    .locator("graphql-row")
    .nth(0)
    .getByTestId("response-box")
    .textContent();

  if (jsonTxt2 && jsonTxt3) {
    const json2 = JSON.parse(jsonTxt2) as {
      operationName: string;
    };
    const json3 = JSON.parse(jsonTxt3) as {
        users: {
          id: string;
          name: string;
        }[];
    };

    expect(json2.operationName).toBe("GetUsers");
    expect(json3.users[0].name).toBe("Alice");
  } else {
    throw new Error("Could not find the request/response JSON content");
  }
});

test("partial match filtering for requests", async () => {
  const filterInput = window.getByPlaceholder("Enter your filter tag");
  await filterInput.click();
  await filterInput.fill("Get");

  await expect(window.locator("graphql-row")).toHaveCount(4); // Expecting 5 rows for partial match ('Get')

  const jsonTxt = await window
    .locator("graphql-row")
    .nth(0)
    .getByTestId("request-box")
    .textContent();

  if (jsonTxt) {
    const json = JSON.parse(jsonTxt) as {
      operationName: string;
    };

    expect(json.operationName).toBe("GetUsers");
  }
});

test("filter by port 8080 to display matching requests", async () => {
  const checkbox8080 = window.getByLabel("8080");
  await checkbox8080.setChecked(true);
  const checkbox8081 = window.getByLabel("8081");
  await checkbox8081.setChecked(false);

  await expect(window.locator("graphql-row")).toHaveCount(3); // Adjust based on your data for port 8080

  const jsonTxt2 = await window
    .locator("graphql-row")
    .nth(0)
    .getByTestId("request-box")
    .textContent();
  const jsonTxt3 = await window
    .locator("graphql-row")
    .nth(0)
    .getByTestId("response-box")
    .textContent();

  if (jsonTxt2 && jsonTxt3) {
    const json2 = JSON.parse(jsonTxt2) as {
      operationName: string;
    };
    const json3 = JSON.parse(jsonTxt3) as {
        users: {
          id: string;
          name: string;
        }[];
    };

    expect(json2.operationName).toBe("GetUsers");
    expect(json3.users[0].name).toBe("Alice");
  } else {
    throw new Error(
      "Could not find the request/response JSON content for port 8080",
    );
  }

  await checkbox8080.uncheck();
});

test("filter by port 8081 to display matching requests", async () => {
  const checkbox8080 = window.getByLabel("8080");
  await checkbox8080.setChecked(false);
  const checkbox8081 = window.getByLabel("8081");
  await checkbox8081.setChecked(true);

  await expect(window.locator("graphql-row")).toHaveCount(3); // Adjust based on your data for port 8081

  const jsonTxt2 = await window
    .locator("graphql-row")
    .nth(0)
    .getByTestId("request-box")
    .textContent();
  const jsonTxt3 = await window
    .locator("graphql-row")
    .nth(0)
    .getByTestId("response-box")
    .textContent();

  if (jsonTxt2 && jsonTxt3) {
    const json2 = JSON.parse(jsonTxt2) as {
      operationName: string;
    };
    const json3 = JSON.parse(jsonTxt3) as {
        users: {
          id: string;
          name: string;
        }[];
    };

    expect(json2.operationName).toBe("GetUsers");
    expect(json3.users[0].name).toBe("Alice");
  } else {
    throw new Error(
      "Could not find the request/response JSON content for port 8081",
    );
  }

  await checkbox8081.uncheck();
});


test("filter by JWT to check for username key presence", async () => {
  // Enter a filter tag for a known key presence, such as "username"
  await window.getByPlaceholder("Enter your filter tag").fill("username");
  
  // Set the filter to apply to JWT content
  await window.getByLabel("JWT").setChecked(true);

  // Expect matching rows to be displayed (adjust the count based on your data)
  await expect(window.locator("graphql-row")).toHaveCount(6); // Example count, adjust based on your data

  // Check if the JWTs contain the 'username' key
  for (let i = 0; i < await window.locator("graphql-row").count(); i++) {
    const jwtContent = await window
      .locator("graphql-row")
      .nth(i)
      .getByTestId("jwt-box")
      .textContent();

    if (jwtContent) {
      // Check if the JWT content includes the key "username" without parsing the JSON
      expect(jwtContent.includes('"username"')).toBeTruthy();
    } else {
      throw new Error("Could not find the JWT content");
    }
  }
});

test("clear all filters to remove all data", async () => {
  const clearButton = window.getByRole("button", { name: "Clear All" });
  await clearButton.click();

  await expect(window.locator("graphql-row")).toHaveCount(0); // Assuming 'Clear All' clears all rows
});


test("verify state persistence via localStorage", async () => {
  // Set states and simulate component refresh
  await window.getByPlaceholder("Enter your filter tag").fill("PersistentTag");
  await window.getByLabel("Regex").setChecked(true);
  await window.getByLabel("JWT").setChecked(true);
  await window.getByLabel("8080").setChecked(false);

  // Reload the page to mimic reinitialization
  await window.reload();

  // Verify that the states are loaded from localStorage correctly with a case-insensitive comparison
  const inputValue = await window.getByPlaceholder("Enter your filter tag").inputValue();
  expect(inputValue.toLowerCase()).toBe("persistenttag");

  // Continue with the rest of the checks
  await expect(window.getByLabel("Regex")).toBeChecked();
  await expect(window.getByLabel("JWT")).toBeChecked();
  await expect(window.getByLabel("8080")).not.toBeChecked();
});

test("verify proxy server checkbox interactions", async () => {
  await window.getByLabel("8080").setChecked(false);
  await expect(window.getByLabel("8080")).not.toBeChecked();

  // Check if localStorage has been updated
  const isStoredUnchecked = await window.evaluate(() => {
    return JSON.parse(localStorage.getItem("proxy-enabled-8080") || "true") === false;
  });
  expect(isStoredUnchecked).toBe(true);
});
