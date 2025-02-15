import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.log("Received WebSocket Event:", JSON.stringify(event, null, 2));
  const { requestContext, body } = event;
  const { routeKey, connectionId } = requestContext;

  return {
    statusCode: 101,
    body: JSON.stringify({ routeKey, connectionId }),
  };
};
