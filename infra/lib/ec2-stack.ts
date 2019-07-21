import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');

interface EC2Props extends cdk.StackProps {
  vpc: ec2.IVpc;
}

export class EC2Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: EC2Props) {
    super(scope, id);

    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      securityGroupName: 'test-laravel',
      description: 'test laravel',
      allowAllOutbound: true
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));

    const role = new iam.Role(this, 'EC2IAMRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      roleName: 'test-laravel-ec2'
    });
    new iam.Policy(this, 'EC2IAMPolicy', {
      policyName: 'test-laravel-ec2',
      roles: [role],
      statements: [new iam.PolicyStatement({
        actions: [
          's3:Get*',
          's3:List*',
        ],
        resources: ['*'],
      })],
    });
    
    const instance = new ec2.CfnInstance(this, 'EC2Instance', {
      iamInstanceProfile: new iam.CfnInstanceProfile(this, 'EC2IAMInstanceProfile', {
        roles: [role.roleName],
      }).ref,
      imageId: 'ami-0a2de1c3b415889d2',
      instanceType: 't2.micro',
      keyName: 'test-laravel',
      securityGroupIds: [securityGroup.securityGroupId],
      subnetId: props.vpc.publicSubnets[0].subnetId,
      tags: [{
        key: 'Name',
        value: 'test-laravel',
      }],
      userData: cdk.Fn.base64(
        cdk.Fn.sub(
          [
            '#!/bin/bash',
            'yum -y update',
            'amazon-linux-extras install ansible2 nginx1.12 php7.3 -y',
            'yum install -y php-fpm php-mbstring php-xml php-bcmath',
            'yum install -y python2-pip ruby',
            'cd /home/ec2-user',
            'curl -O https://aws-codedeploy-${AWS::Region}.s3.amazonaws.com/latest/install',
            'chmod +x ./install',
            './install auto',
          ].join("\n")
        )
      ),
    });

    new ec2.CfnEIPAssociation(this, 'EC2EIPAssociation', {
      eip: new ec2.CfnEIP(this, 'ElasticIP', {
        domain: 'vpc',
      }).ref,
      instanceId: instance.ref,
    });

    new cdk.CfnOutput(this, 'EC2IP', {
      value: instance.attrPublicIp,
    });
  }
}
