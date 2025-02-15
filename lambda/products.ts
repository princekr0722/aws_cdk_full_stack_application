import {
  AttributeValue,
  DynamoDBClient,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyHandler,
} from "aws-lambda";
import { randomUUID } from "crypto";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import * as jwt from "jsonwebtoken";
import * as Busboy from "busboy";
import { Readable } from "stream";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const dynamoDBClient = new DynamoDBClient();
const dynamo = DynamoDBDocumentClient.from(dynamoDBClient);
const PRODUCT_TABLE_NAME = "products";
const s3 = new S3Client({});

export const handler: APIGatewayProxyHandler = async (event) => {
  let statusCode = 200,
    body = "",
    headers = { "Content-Type": "application/json" };

  const {
    path,
    pathParameters,
    headers: requestHeaders,
    body: requestBody,
    httpMethod,
  } = event;

  try {
    authenticateTheUser(requestHeaders);
  } catch (error) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        errorMessage:
          error instanceof Error ? error.message : "Failed to authenticate",
      }),
    };
  }

  try {
    switch (`${httpMethod} ${path}`) {
      case "POST /product": {
        const createdProduct = await handleAddNewProduct(requestBody);
        body = JSON.stringify(createdProduct);
        break;
      }
      case "GET /product/all": {
        const allProducts = await handleGetAllProduct();
        body = JSON.stringify(allProducts);
        break;
      }
      case `POST /product/${pathParameters?.id}/image`: {
        body = JSON.stringify(
          await handleUploadProductImage(
            requestHeaders,
            pathParameters?.id,
            body
          )
        );
        break;
      }
      default: {
        throw new Error(`Unknown Path: ${httpMethod} ${path}`);
      }
    }
  } catch (error) {
    statusCode = 400;
    body = JSON.stringify({
      errorMessage:
        error instanceof Error ? error.message : "Failed to process request",
    });
    console.log(error);
  }

  return {
    statusCode,
    body,
    headers,
  };
};

async function handleAddNewProduct(
  body: string | null
): Promise<Record<string, any> | undefined> {
  if (!body) throw new Error("Invalid body");
  const newProduct = JSON.parse(body);
  newProduct.id = randomUUID();

  await dynamo.send(
    new PutCommand({
      TableName: PRODUCT_TABLE_NAME,
      Item: newProduct,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return (
    await dynamo.send(
      new GetCommand({
        TableName: PRODUCT_TABLE_NAME,
        Key: { id: newProduct.id },
      })
    )
  ).Item;
}

async function handleGetAllProduct(): Promise<
  Record<string, AttributeValue>[] | undefined
> {
  const { Items } = await dynamo.send(
    new ScanCommand({
      TableName: PRODUCT_TABLE_NAME,
    })
  );
  return Items?.map((item) => unmarshall(item));
}
function authenticateTheUser(requestHeaders: APIGatewayProxyEventHeaders) {
  const authHeader = requestHeaders["Authorization"];
  if (authHeader == null) throw new Error("Missing Authorization");
  try {
    const token = authHeader.replaceAll("Bearer ", "");
    const payload = jwt.verify(token, "your_secret_key") as jwt.JwtPayload;
    const userId = payload["userId"];
    const username = payload["username"];
  } catch (error) {
    throw new Error("Invalid Token");
  }
}
async function handleUploadProductImage(
  headers: APIGatewayProxyEventHeaders,
  id: string | undefined,
  body: string
): Promise<{ imageUrl: string }> {
  const contentType = headers["Content-Type"] || headers["content-type"];
  if (!contentType?.startsWith("multipart/form-data")) {
    throw new Error(
      `Expected content-type was 'multipart/form-data' but found '${contentType}'`
    );
  }
  if (!id) throw new Error("Product is null");

  const PRODUCT_BUCKET_NAME = process.env.PRODUCT_BUCKET_NAME;

  return new Promise((resolve, reject) => {
    try {
      const busboy = Busboy({ headers: { "content-type": contentType } });
      let imageKey = "";
      const fileUploadPromises: Promise<void>[] = [];
      let fileCount = 0;
      busboy.on(
        "file",
        (
          fieldname: string,
          file: Readable,
          filename: string,
          encoding: string,
          mimetype: string
        ) => {
          fileCount++;
          if (fileCount > 1) {
            throw new Error("Only one image can be uploaded for product");
          }

          imageKey = `product-${id}/${randomUUID()}-${filename}`;

          if (!["image/jpeg", "image/png", "image/webp"].includes(mimetype)) {
            throw new Error(
              "Invalid image format. Only JPEG, PNG, and WebP are allowed."
            );
          }
          const uploadPromise = s3
            .send(
              new PutObjectCommand({
                Bucket: PRODUCT_BUCKET_NAME,
                Key: imageKey,
                Body: file, // file is a readable stream
                ContentType: mimetype,
              })
            )
            .then(() => {});

          fileUploadPromises.push(uploadPromise);
        }
      );

      busboy.on("finish", async () => {
        try {
          if (fileUploadPromises.length === 0) {
            return reject(new Error("No image file uploaded"));
          }

          await Promise.all(fileUploadPromises);

          resolve({
            imageUrl: `http://localhost:4566/${PRODUCT_BUCKET_NAME}/${imageKey}`,
          });
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}
