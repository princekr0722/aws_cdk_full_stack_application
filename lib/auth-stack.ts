import {
  aws_apigateway,
  aws_dynamodb,
  aws_iam,
  aws_lambda,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class AuthStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const usersTable = new aws_dynamodb.TableV2(this, "UsersTable", {
      tableName: "users",
      partitionKey: { name: "id", type: aws_dynamodb.AttributeType.STRING },
      contributorInsights: true,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
    });

    usersTable.addGlobalSecondaryIndex({
      indexName: "UsernameIndex",
      partitionKey: { name: "username", type: AttributeType.STRING },
    });

    const authTable = new aws_dynamodb.TableV2(this, "AuthTable", {
      tableName: "auth_tokens",
      partitionKey: { name: "id", type: aws_dynamodb.AttributeType.STRING },
      contributorInsights: true,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
    });

    const authHandlerFunction = new NodejsFunction(this, "AuthLambdaFunction", {
      runtime: aws_lambda.Runtime.NODEJS_20_X,
      entry: "./lambda/auth.ts",
      handler: "handler",
      bundling: {
        nodeModules: ["bcryptjs", "jsonwebtoken"],
      },
    });

    usersTable.grantFullAccess(authHandlerFunction);
    authTable.grantFullAccess(authHandlerFunction);

    const apigw = new aws_apigateway.LambdaRestApi(this, "AuthApiGateway", {
      handler: authHandlerFunction,
      proxy: false,
    });

    authHandlerFunction.grantInvoke(
      new aws_iam.ServicePrincipal("apigateway.amazonaws.com")
    );

    apigw.root.addResource("signup").addMethod("POST");
    apigw.root.addResource("signin").addMethod("POST");
  }
}
