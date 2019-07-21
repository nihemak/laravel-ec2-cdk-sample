import cdk = require('@aws-cdk/core');
import ecr = require('@aws-cdk/aws-ecr');
import iam = require('@aws-cdk/aws-iam');
import codecommit = require('@aws-cdk/aws-codecommit');
import codebuild = require('@aws-cdk/aws-codebuild');

export interface BuildProps {
  codeCommitRepo: codecommit.IRepository
}

export class BuildEnvStack extends cdk.Stack {
  readonly ecrRepo: ecr.IRepository;

  constructor(scope: cdk.Construct, id: string, props: BuildProps) {
    super(scope, id);

    this.ecrRepo = new ecr.Repository(this, 'EcrRepo', {
      repositoryName: 'test-laravel',
    });
    this.ecrRepo.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('codebuild.amazonaws.com')],
      actions: [
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
        'ecr:BatchCheckLayerAvailability'
      ],
    }));

    new codebuild.Project(this, 'EcrBuildProject', {
      projectName: 'laravel-ec2-sample-ecr',
      role: new iam.Role(this, 'EcrBuildServiceRole', {
        assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
        ],
        roleName: 'laravel-ec2-sample-ecr-build'
      }),
      source: codebuild.Source.codeCommit({ repository: props.codeCommitRepo }),
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec_ecr.yml'),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
        computeType: codebuild.ComputeType.SMALL,
        privileged: true,
        environmentVariables: {
          'REGION': {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: 'ap-northeast-1',
          },
          'IMAGE_REPO_NAME': {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: 'test-laravel',
          },
          'IMAGE_TAG': {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: 'latest',
          },
          'ECR_REPO_URL': {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: this.ecrRepo.repositoryUri,
          }
        }
      }
    });
  }
}
