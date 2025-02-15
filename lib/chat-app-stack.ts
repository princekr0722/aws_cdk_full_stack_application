import {
  aws_apigatewayv2,
  aws_dynamodb,
  aws_lambda,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { WebSocketLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class ChatAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // WEB-SOCKET is not supported in localstack
    // const chatMessagesTable = new aws_dynamodb.TableV2(this, "MessagesTable", {
    //   tableName: "chatMessages",
    //   partitionKey: { name: "id", type: AttributeType.STRING },
    //   contributorInsights: true,
    //   pointInTimeRecoverySpecification: {
    //     pointInTimeRecoveryEnabled: true,
    //   },
    //   removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
    // });

    // const chatMessagesHandlerFunction = new NodejsFunction(
    //   this,
    //   "ChatMessagesHandlerFunction",
    //   {
    //     runtime: aws_lambda.Runtime.NODEJS_20_X,
    //     entry: "./lambda/chatting.ts",
    //     handler: "handler",
    //   }
    // );

    // chatMessagesTable.grantFullAccess(chatMessagesHandlerFunction);

    // // setup socket
    // const chatSocketApi = new aws_apigatewayv2.WebSocketApi(
    //   this,
    //   "ChatSocketApi"
    // );

    // new aws_apigatewayv2.WebSocketStage(this, "ChatSocketApiStage", {
    //   webSocketApi: chatSocketApi,
    //   stageName: "dev",
    //   autoDeploy: true,
    // });

    // const chatFunctionIntegration = new WebSocketLambdaIntegration(
    //   "ChatMessagesHandlerFunctionIntegration",
    //   chatMessagesHandlerFunction
    // );

    // chatSocketApi.addRoute("sendMessage", {
    //   integration: chatFunctionIntegration,
    // });
  }
}
