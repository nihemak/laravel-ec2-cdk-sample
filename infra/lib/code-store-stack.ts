import cdk = require('@aws-cdk/core');
import codecommit = require('@aws-cdk/aws-codecommit');

export class CodeStoreStack extends cdk.Stack {
  readonly codeCommitRepo: codecommit.IRepository;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.codeCommitRepo = new codecommit.Repository(this, 'Repository', {
      repositoryName: 'laravel-ec2-sample',
    });

    new cdk.CfnOutput(this, 'CodeCommitRepoArn', {
      value: this.codeCommitRepo.repositoryArn,
      exportName: `${this.stackName}-CodeCommitRepoArn`
    });

    new cdk.CfnOutput(this, 'CodeCommitRepoName', {
      value: this.codeCommitRepo.repositoryName,
      exportName: `${this.stackName}-CodeCommitRepoName`
    });

    new cdk.CfnOutput(this, 'CodeCommitRepoCloneUrlHttp', {
      value: this.codeCommitRepo.repositoryCloneUrlHttp,
      exportName: `${this.stackName}-CodeCommitRepoCloneUrlHttp`
    });
  }
}
