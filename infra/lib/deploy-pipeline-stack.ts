import cdk = require('@aws-cdk/core');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import ecr = require('@aws-cdk/aws-ecr');
import codecommit = require('@aws-cdk/aws-codecommit');
import codebuild = require('@aws-cdk/aws-codebuild');
import codedeploy = require('@aws-cdk/aws-codedeploy');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import targets = require('@aws-cdk/aws-events-targets');
import events = require('@aws-cdk/aws-events');

interface DeployPipelineProps extends cdk.StackProps {
  codeCommitRepo: codecommit.IRepository,
  ecrRepo: ecr.IRepository,
}

export class DeployPipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: DeployPipelineProps) {
    super(scope, id);

    const sourceArtifact = new codepipeline.Artifact('PipelineArtifact');
    const buildArtifact = new codepipeline.Artifact();

    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'test-laravel',
      role: new iam.Role(this, 'PipelineServiceRole', {
        assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
        ],
        roleName: 'test-larabel-pipeline'
      }),
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.CodeCommitSourceAction({
              actionName: 'Source',
              repository: props.codeCommitRepo,
              output: sourceArtifact,
              trigger: codepipeline_actions.CodeCommitTrigger.NONE,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Build',
              input: sourceArtifact,
              project: new codebuild.Project(this, 'BuildProject', {
                projectName: 'laravel-ec2-sample',
                role: new iam.Role(this, 'BuildServiceRole', {
                  assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
                  managedPolicies: [
                    iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
                  ],
                  roleName: 'laravel-ec2-sample-build'
                }),
                source: codebuild.Source.codeCommit({ repository: props.codeCommitRepo }),
                buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
                environment: {
                  buildImage: codebuild.LinuxBuildImage.fromEcrRepository(props.ecrRepo),
                  computeType: codebuild.ComputeType.SMALL,
                },
                cache: codebuild.Cache.bucket(new s3.Bucket(this, 'BuildCacheS3Bucket', {
                  bucketName: 'test-laravel-codebuild-cache',
                })),
              }),
              outputs: [
                buildArtifact
              ],
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new codepipeline_actions.CodeDeployServerDeployAction({
              actionName: 'Deploy',
              input: buildArtifact,
              deploymentGroup: new codedeploy.ServerDeploymentGroup(this, 'DeployGroup', {
                application: new codedeploy.ServerApplication(this, 'DeployApplication', {
                  applicationName: 'test-laravel',
                }),
                role: new iam.Role(this, 'DeployServiceRole', {
                  assumedBy: new iam.ServicePrincipal('codedeploy.amazonaws.com'),
                  managedPolicies: [
                    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSCodeDeployRole'),
                  ],
                  roleName: 'test-laravel-deploy'
                }),
                deploymentGroupName: 'test-laravel',
                deploymentConfig: codedeploy.ServerDeploymentConfig.ALL_AT_ONCE,
                ec2InstanceTags: new codedeploy.InstanceTagSet({
                  'Name': ['test-laravel'],
                }),
              }),
            }),
          ],
        },
      ],
      artifactBucket: new s3.Bucket(this, 'PipelineS3Bucket', {
        bucketName: 'test-laravel-pipeline',
      }),
    });

    new events.Rule(this, 'EventRule', {
      eventPattern: {
        source: ['aws.codecommit'],
        detailType: ['CodeCommit Repository State Change'],
        resources: [props.codeCommitRepo.repositoryArn],
        detail: {
          event: [
            'referenceCreated',
            'referenceUpdated',
          ],
          referenceType: ['branch'],
          referenceName: ['master'],
        }
      },
      ruleName: 'TestLaravel',
      targets: [
        new targets.CodePipeline(pipeline),
      ],
    });
  }
}
