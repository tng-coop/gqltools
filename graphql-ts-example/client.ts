import axios, { AxiosInstance, AxiosResponse } from "axios";
import fs from "fs";
import path from "path";
import { HttpProxyAgent } from "http-proxy-agent";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Convert `import.meta.url` to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the GraphQL response types
interface User {
  id: number;
  name: string;
}

interface UsersResponse {
  users: User[];
}

interface CreateUserResponse {
  createUser: User;
}

interface GraphQLResponse<T> {
  data: T;
}

// Load a GraphQL query from a .gql file
const queryPath = path.join(__dirname, "queries", "getUsers.gql");
const mutationPath = path.join(__dirname, "mutations", "createUser.gql");

const getUsersQuery = fs.readFileSync(queryPath, "utf8");
const createUserMutation = fs.readFileSync(mutationPath, "utf8");

// Define the proxy server settings
const proxies = [
  {
    host: "127.0.0.1",
    port: 8080, // Replace with your proxy port
    protocol: "http", // or 'https' depending on your proxy
  },
  {
    host: "127.0.0.1",
    port: 8081, // Replace with your second proxy port
    protocol: "http", // or 'https' depending on your proxy
  },
];

// Create HTTP/HTTPS proxy agents once for both proxies
const proxyAgents = proxies.map(
  (proxy) =>
    new HttpProxyAgent(`${proxy.protocol}://${proxy.host}:${proxy.port}`),
);

// Authenticate and get the JWT
async function authenticate(): Promise<string> {
  try {
    // console.log("Authenticating with server...");
    const response: AxiosResponse<{ token: string }> = await axios.post(
      "http://127.0.0.1:4000/login",
      {
        username: "admin",
        password: "password",
      },
    );

    // console.log(
    //   "Authentication successful, received token:",
    //   response.data.token,
    // );
    return response.data.token;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Error during authentication:",
        error.response?.data || error.message,
      );
    } else {
      console.error("Unexpected error during authentication:", error);
    }
    throw error;
  }
}

// Create an Axios instance for GraphQL requests with the authorization header and proxy
function createAuthenticatedInstance(
  token: string,
  proxyIndex: number,
): AxiosInstance {
  // console.log(
  //   `Creating authenticated Axios instance with token and proxy ${proxyIndex}`,
  // );
  return axios.create({
    httpAgent: proxyAgents[proxyIndex],
    httpsAgent: proxyAgents[proxyIndex],
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Send the query to the GraphQL server through the proxy
async function fetchUsers(axiosInstance: AxiosInstance): Promise<void> {
  try {
    // console.log("Fetching users from GraphQL server...");

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const response: AxiosResponse<GraphQLResponse<UsersResponse>> =
      await axiosInstance.post("http://127.0.0.1:4000/graphql", {
        query: getUsersQuery,
        operationName: "GetUsers",
      });

    // console.log("Users:", response.data.data.users);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // console.error(
      //   "Error fetching users:",
      //   error.response?.data || error.message,
      // );
    } else {
      console.error("Unexpected error fetching users:", error);
    }
  }
}

// Send the mutation to the GraphQL server through the proxy
async function createUser(
  axiosInstance: AxiosInstance,
  name: string,
): Promise<void> {
  try {
    // console.log(`Creating user '${name}' on GraphQL server...`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const response: AxiosResponse<GraphQLResponse<CreateUserResponse>> =
      await axiosInstance.post("http://127.0.0.1:4000/graphql", {
        query: createUserMutation,
        variables: { input: { name } },
        operationName: "CreateUser",
      });

    // console.log("Created user:", response.data.data.createUser);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // console.error(
      //   "Error creating user:",
      //   error.response?.data || error.message,
      // );
    } else {
      // console.error("Unexpected error creating user:", error);
    }
  }
}

// Define user names to create with proxies
const users = ["Charlie", "Paul"]; // Add more users if needed

async function run() {
  try {
    // Authenticate and get the token
    const token = await authenticate();

    // Loop through each proxy and corresponding user
    for (let i = 0; i < users.length; i++) {
      const proxyIndex = i; // Adjust proxy index dynamically
      const userName = users[i];

      // Create Axios instance for the corresponding proxy
      const axiosInstance = createAuthenticatedInstance(token, proxyIndex);

      // console.log(`Using proxy ${proxyIndex} for user ${userName}`);
      // say hello 20 times
      for (let j = 0; j < 1; j++) {
        // Fetch users and create a new user
        await fetchUsers(axiosInstance);
        await createUser(axiosInstance, userName);
        await fetchUsers(axiosInstance); // Fetch again to confirm the new user creation
      }

    }

    // console.log("All users have been processed successfully.");
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "An error occurred during execution:",
        error.response?.data || error.message,
      );
    } else {
      console.error("Unexpected error occurred during execution:", error);
    }
  }
}

run().catch((error) => {
  console.error("An unexpected error occurred during execution:", error);
});
