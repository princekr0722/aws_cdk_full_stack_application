import {
  aws_apigateway,
  aws_dynamodb,
  aws_iam,
  aws_lambda,
  aws_s3,
  CfnOutput,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class ProductsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const PRODUCT_TABLE_NAME = "products";
    const productTable = new aws_dynamodb.TableV2(this, "ProductTable", {
      tableName: PRODUCT_TABLE_NAME,
      partitionKey: { name: "id", type: aws_dynamodb.AttributeType.STRING },
      contributorInsights: true,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
    });

    const PRODUCT_BUCKET_NAME = "product-bucket";
    const productFunction = new NodejsFunction(this, "ProductFunction", {
      functionName: "product-function",
      entry: "./lambda/products.ts",
      handler: "handler",
      runtime: aws_lambda.Runtime.NODEJS_20_X,
      bundling: {
        nodeModules: ["jsonwebtoken", "busboy"],
      },
      environment: {
        PRODUCT_BUCKET_NAME,
      },
    });

    productTable.grantFullAccess(productFunction);

    const productBucket = new aws_s3.Bucket(this, "ProductBucket", {
      bucketName: PRODUCT_BUCKET_NAME,
      removalPolicy: RemovalPolicy.DESTROY,
      publicReadAccess: true,
      blockPublicAccess: new aws_s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      versioned: true,
    });

    productBucket.grantReadWrite(productFunction);

    const productApiGw = new aws_apigateway.LambdaRestApi(
      this,
      "ProductApiGateway",
      {
        handler: productFunction,
        proxy: false,
      }
    );

    const productResource = productApiGw.root.addResource("product");
    productResource.addMethod("POST");
    productResource.addResource("all").addMethod("GET");
    const productImageResource = productResource
      .addResource("{id}")
      .addResource("image");

    productImageResource.addMethod(
      "POST",
      new aws_apigateway.LambdaIntegration(productFunction),
      {
        requestParameters: {
          "method.request.path.id": true, // Ensure product id is passed
          "method.request.header.Content-Type": true, // Ensure Content-Type is passed
        },
      }
    );

    productFunction.grantInvoke(
      new aws_iam.ServicePrincipal("apigateway.amazonaws.com")
    );

    new CfnOutput(this, "ProductBucketURL", {
      value: productBucket.bucketWebsiteUrl,
    });
  }
}
