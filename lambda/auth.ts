import {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { throws } from "assert";
import { log } from "console";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

const client = new DynamoDBClient();
const dynamo = DynamoDBDocumentClient.from(client);
const USERS_TABLE_NAME = "users";
const AUTH_TOKENS_TABLE_NAME = "auth_tokens";

export const handler: APIGatewayProxyHandler = async (event) => {
  const { path, body, pathParameters, headers, httpMethod } = event;

  try {
    switch (`${httpMethod} ${path}`) {
      case "POST /signup": {
        return await handleSignUp(headers, body);
      }
      case "POST /signin": {
        return handleSignIn(headers, body);
      }
      default: {
        throw new Error(`Unknown path: ${httpMethod} '${path}'`);
      }
    }
  } catch (error) {
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) errorMessage = error.message;
    const statusCode = 500;
    const responseBody = JSON.stringify({
      errorMessage,
    });
    return {
      statusCode,
      body: responseBody,
    };
  }
};

/*
+-----------+
|  SIGN UP  |
+-----------+
*/

async function handleSignUp(
  headers: APIGatewayProxyEventHeaders,
  body: string | null
): Promise<APIGatewayProxyResult> {
  const newUserDetails = toNewUserDetails(body);
  console.log(`INITIAL BODY: ${JSON.stringify(newUserDetails)}`);
  let statusCode, responseBody, responseHeaders;

  try {
    console.log("DEBUG: Validating new user details...");
    await validateNewUserDetails(newUserDetails);
    console.log("DEBUG: Validation passed.");
  } catch (error) {
    console.log("ERROR: Validation failed:", error);
    let errorMessage = "Invalid request";
    if (error instanceof Error) errorMessage = error.message;
    else log(error);

    statusCode = 400;
    responseBody = JSON.stringify({
      errorMessage,
    });

    return {
      statusCode,
      body: responseBody,
      headers: responseHeaders,
    };
  }

  console.log("DEBUG: Hashing password...");
  newUserDetails.password = await bcrypt.hash(newUserDetails.password, 10);
  const newUserToCreate = {
    ...newUserDetails,
    dob: newUserDetails.dob.toISOString(),
    createdOn: new Date().toISOString(),
  };
  console.log(
    "DEBUG: New user before insert:",
    JSON.stringify(newUserToCreate)
  );
  const {
    $metadata: { httpStatusCode },
  } = await dynamo.send(
    new PutCommand({
      TableName: USERS_TABLE_NAME,
      Item: newUserToCreate,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  if (!isDbQuerySuccess(httpStatusCode)) {
    throw new Error("Failed to create user");
  }

  const createdUser = (
    await dynamo.send(
      new GetCommand({
        TableName: USERS_TABLE_NAME,
        Key: { id: newUserDetails.id },
      })
    )
  ).Item;
  statusCode = 201;
  responseBody = JSON.stringify({ ...createdUser, password: null });

  return {
    statusCode,
    body: responseBody,
    headers: responseHeaders,
  };
}

interface NewUserDetails {
  id: string;
  username: string;
  phoneNumber: string;
  dob: Date;
  password: string;
}

function toNewUserDetails(obj: any): NewUserDetails {
  obj = JSON.parse(obj || "");
  if (!obj.username || !obj.phoneNumber || !obj.dob || !obj.password) {
    throw new Error("Missing required fields");
  }

  return {
    id: randomUUID(),
    username: String(obj.username),
    phoneNumber: String(obj.phoneNumber),
    dob: new Date(obj.dob),
    password: String(obj.password),
  };
}

async function validateNewUserDetails(newUserDetails: NewUserDetails) {
  console.log("DEBUG: Checking if username exists:", newUserDetails.username);

  if (!newUserDetails.username) {
    throw new Error("Username is missing!");
  }
  const queryResult = await dynamo.send(
    new QueryCommand({
      TableName: USERS_TABLE_NAME,
      IndexName: "UsernameIndex",
      KeyConditionExpression: "username = :username",
      ExpressionAttributeValues: {
        ":username": { S: newUserDetails.username },
      },
    })
  );
  const existingUser = queryResult.Items?.[0];
  console.log("ExistingUser", JSON.stringify(existingUser));
  if (existingUser)
    throw new Error(`Username '${newUserDetails.username}' is not available`);
  validateDob(newUserDetails.dob);
  validatePhoneNumber(newUserDetails.phoneNumber);
  validatePassword(newUserDetails.password);
}

function validateDob(dob: string | Date): void {
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) throw new Error(`Invalid DOB: ${dob}`);

  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();

  // Ensure age is between 14 and 150 years
  if (age < 14) throw new Error("User should be younger than 14years");
  else if (age > 150) throw new Error("User should be older than 150years");
}

function validatePhoneNumber(phone: string): void {
  // valid ex: +123-1234512345
  const phoneRegex = /^\+\d{1,3}-\d{10}$/;
  if (!phoneRegex.test(phone)) throw new Error(`Invalid phoneNumber: ${phone}`);
}

function validatePassword(password: string): void {
  let errorMsg;
  if (password.length < 8)
    errorMsg = "Password must be at least 8 characters long.";
  if (!/[a-z]/.test(password))
    errorMsg = "Password must contain at least one lowercase letter.";
  if (!/[A-Z]/.test(password))
    errorMsg = "Password must contain at least one uppercase letter.";
  if (!/\d/.test(password))
    errorMsg = "Password must contain at least one digit.";

  if (errorMsg) throw new Error(errorMsg);
}

/*
+-----------+
|  SIGN IN  |
+-----------+
*/

async function handleSignIn(
  headers: APIGatewayProxyEventHeaders,
  body: string | null
): Promise<APIGatewayProxyResult> {
  const defaultHeader = { "Content-Type": "application/json" };

  try {
    // extract cred
    if (body == null) throw new Error("Missing Credentials");
    const cred = JSON.parse(body);
    if ((!cred.username && !cred.phoneNumber) || !cred.password)
      throw new Error("Invalid Credentials");
    // find user with cred
    const foundUser = (
      await dynamo.send(
        new QueryCommand({
          TableName: USERS_TABLE_NAME,
          IndexName: "UsernameIndex",
          KeyConditionExpression: "username = :username",
          ExpressionAttributeValues: {
            ":username": { S: cred.username },
          },
        })
      )
    ).Items?.[0];

    // validate cred
    const invalidCredMsg = `Invalid credentials`;
    if (foundUser == null) throw new Error(invalidCredMsg);
    const passwordMatched = bcrypt.compare(
      cred.password,
      foundUser?.password?.S || ""
    );
    if (!passwordMatched) throw new Error(invalidCredMsg);

    // generate token
    const jwtToken = generateToken({
      userId: foundUser.id?.S || "",
      username: foundUser.username?.S || "",
    });

    const newToken: AuthToken = {
      id: randomUUID(),
      token: jwtToken,
      userId: foundUser.id?.S || "",
      createdOn: new Date().toISOString(),
    };

    const {
      $metadata: { httpStatusCode },
    } = await dynamo.send(
      new PutCommand({
        TableName: AUTH_TOKENS_TABLE_NAME,
        Item: newToken,
      })
    );

    if (!isDbQuerySuccess(httpStatusCode))
      throw new Error("Failed to generate AWT Token");

    return {
      statusCode: 200,
      headers: { ...defaultHeader, Authorization: `Bearer ${jwtToken}` },
      body: JSON.stringify({ message: "Signed-in successfully" }),
    };
  } catch (error) {
    let errorMessage = "Authentication failure";
    if (error instanceof Error) errorMessage = error.message;
    else log(error);

    return {
      statusCode: 401,
      headers: defaultHeader,
      body: JSON.stringify({ errorMessage }),
    };
  }
}

interface AuthToken {
  id: string;
  token: string;
  userId: string;
  createdOn: string;
}

interface JwtTokenPayload {
  userId: string;
  username: string;
}

function generateToken(payload: JwtTokenPayload): string {
  const SECRET_KEY = "your_secret_key";
  return jwt.sign(payload, SECRET_KEY, { expiresIn: "1d" }); // ✅ Token valid for 1 day
}

/*
+----------+
|  COMMON  |
+----------+
*/

function isDbQuerySuccess(httpStatusCode: number | undefined) {
  return !(
    httpStatusCode == null ||
    httpStatusCode < 200 ||
    httpStatusCode > 299
  );
}
