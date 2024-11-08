import express, { Request, Response, NextFunction } from "express";
import { createHandler } from "graphql-http/lib/use/express";
import { buildSchema } from "graphql";
import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";
import bodyParser from "body-parser";

// Secret key for signing JWTs
const SECRET_KEY = "your-secret-key";

// Extend Express Request interface globally without using namespaces
declare module "express-serve-static-core" {
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
  hello: (): string => {
    return "Hello world!";
  },
  users: (): User[] => {
    return users;
  },
  createUser: ({ input }: { input: { name: string } }): User => {
    const newUser: User = {
      id: users.length + 1,
      name: input.name,
    };
    users.push(newUser);
    return newUser;
  },
};

const app = express();
app.use(bodyParser.json());

// Log all incoming requests
app.use((req: Request, res: Response, next: NextFunction): void => {
  next();
});

interface LoginRequestBody {
  username: string;
  password: string;
}

// Login route - should be defined before the JWT middleware
app.post("/login", (req: Request, res: Response): void => {
  const { username, password } = req.body as LoginRequestBody;
  if (username === "admin" && password === "password") {
    const signOptions: SignOptions = { expiresIn: "1h" };
    const token = jwt.sign({ username }, SECRET_KEY, signOptions);
    res.json({ token });
    return;
  }
  res.status(401).json({ message: "Invalid credentials" });
});

// JWT middleware - should be applied after login route
app.use((req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        res.status(401).json({ message: "Unauthorized" });
      } else {
        req.user = decoded as JwtPayload & { username: string };
        next();
      }
    });
  } else {
    res.status(401).json({ message: "No token provided" });
  }
});

// GraphQL endpoint using graphql-http
app.use("/graphql", createHandler({
  schema: schema,
  rootValue: root,

}));

app.listen(4000, () =>
  console.log("GraphQL server running on http://127.0.0.1:4000/graphql"),
);
