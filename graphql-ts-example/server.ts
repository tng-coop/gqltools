import express, { Request, Response, NextFunction } from "express";
import { graphqlHTTP } from "express-graphql";
import { buildSchema } from "graphql";
import jwt, { SignOptions } from "jsonwebtoken";
import bodyParser from "body-parser";

// Secret key for signing JWTs
const SECRET_KEY = "your-secret-key";

// Extend Express Request interface globally
declare module "express" {
  interface Request {
    user?: { username: string };
  }
}

// Define your schema and resolvers
const schema = buildSchema(`
  type Query {
    hello: String
    users: [User]
  }

  type User {
    id: ID
    name: String
  }

  input UserInput {
    name: String
  }

  type Mutation {
    createUser(input: UserInput): User
  }
`);

interface User {
  id: number;
  name: string;
}

const users: User[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

const root = {
  hello: () => {
    return "Hello world!";
  },
  users: () => {
    return users;
  },
  createUser: ({ input }: { input: { name: string } }): User => {
    const newUser: User = { id: users.length + 1, name: input.name };
    users.push(newUser);
    return newUser;
  },
};

const app = express();
app.use(bodyParser.json());

// Log all incoming requests
app.use((req: Request, res: Response, next: NextFunction) => {
  // console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});
interface LoginRequestBody {
  username: string;
  password: string;
}

// Login route - should be defined before the JWT middleware
app.post("/login", (req: Request, res: Response) => {
  // console.log("Login attempt with body:", req.body);

  const { username, password } = req.body as LoginRequestBody;
  if (username === "admin" && password === "password") {
    const signOptions: SignOptions = { expiresIn: "1h" };
    const token = jwt.sign({ username }, SECRET_KEY, signOptions);
    // console.log("Login successful, returning token:", token);
    return res.json({ token });
  }

  // console.log("Login failed: Invalid credentials");
  return res.status(401).json({ message: "Invalid credentials" });
});

// JWT middleware - should be applied after login route
app.use((req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    // console.log("JWT middleware: Token found, verifying...");
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        // console.log("JWT middleware: Token verification failed:", err.message);
        return res.status(401).json({ message: "Unauthorized" });
      } else {
        req.user = decoded as { username: string };
        // console.log("JWT middleware: Token verified, user:", req.user);
        next();
      }
    });
  } else {
    // console.log("JWT middleware: No token provided");
    return res.status(401).json({ message: "No token provided" });
  }
});

// GraphQL endpoint
app.use("/graphql", (req: Request, res: Response, next: NextFunction) => {
  // console.log("GraphQL request:", req.body);
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  })(req, res).catch(next); // Properly handle the promise
});

app.listen(4000, () =>
  console.log("GraphQL server running on http://127.0.0.1:4000/graphql"),
);
