#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AuthStack } from "../lib/auth-stack";
import { ProductsStack } from "../lib/products-stack";
import { WebsiteStack } from "../lib/website-stack";

const app = new cdk.App();
new AuthStack(app, "AuthStack");
// new ChatAppStack(app, "ChatAppStack");
new ProductsStack(app, "ProductsStack");
new WebsiteStack(app, "WebsiteStack");
