import {
  aws_iam,
  aws_s3,
  aws_s3_deployment,
  CfnOutput,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { BlockPublicAccess, BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class WebsiteStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    // WEBSITE
    const websiteBucket = new aws_s3.Bucket(this, "StaticWebsiteBucket", {
      bucketName: "product-static-website",
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
      blockPublicAccess: new aws_s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      versioned: true,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
    });

    // BucketDeployment is present in Localstack
    // new aws_s3_deployment.BucketDeployment(this, "DeployWebsite", {
    //   sources: [aws_s3_deployment.Source.asset("./website")],
    //   destinationBucket: websiteBucket,
    // });

    new CfnOutput(this, "WebsiteURL", {
      value: websiteBucket.bucketWebsiteUrl,
    });
  }
}
