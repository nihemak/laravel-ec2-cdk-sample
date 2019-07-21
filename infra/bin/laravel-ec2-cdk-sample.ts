#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { CodeStoreStack } from '../lib/code-store-stack';
import { BuildEnvStack } from '../lib/build-env-stack';
import { NetworkStack } from '../lib/network-stack';
import { EC2Stack } from '../lib/ec2-stack';
import { DeployPipelineStack } from '../lib/deploy-pipeline-stack';

const app = new cdk.App();
const codeStore = new CodeStoreStack(app, 'CodeStore');
const buildEnv = new BuildEnvStack(app, 'BuildEnv', {
    codeCommitRepo: codeStore.codeCommitRepo
});
const network = new NetworkStack(app, 'Network');
new EC2Stack(app, 'EC2', {
    vpc: network.vpc,
});
new DeployPipelineStack(app, 'DeployPipeline', {
    codeCommitRepo: codeStore.codeCommitRepo,
    ecrRepo: buildEnv.ecrRepo,
});
