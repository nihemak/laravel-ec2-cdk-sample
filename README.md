# Setup Environment

## Create CodeCommit

```bash
git clone https://github.com/nihemak/laravel-ec2-cdk-sample.git
cd laravel-ec2-cdk-sample/infra
npm install
npm run build
./node_modules/aws-cdk/bin/cdk deploy CodeStore --require-approval never
git push ssh://git-codecommit.ap-northeast-1.amazonaws.com/v1/repos/laravel-ec2-sample --all
```

## Create CodeBuild ecr

```bash
./node_modules/aws-cdk/bin/cdk deploy BuildEnv --require-approval never
CODEBUILD_ID=$(aws codebuild start-build --project-name laravel-ec2-sample-ecr --source-version master | tr -d "\n" | jq -r '.build.id')
echo "started.. id is ${CODEBUILD_ID}"
while true
do
  sleep 10s
  STATUS=$(aws codebuild batch-get-builds --ids "${CODEBUILD_ID}" | tr -d "\n" | jq -r '.builds[].buildStatus')
  echo "..status is ${STATUS}."
  if [ "${STATUS}" != "IN_PROGRESS" ]; then
    if [ "${STATUS}" != "SUCCEEDED" ]; then
      echo "faild."
    fi
    echo "done."
    break
  fi
done
```

## Create VPC and EC2 instance

```bash
key_pair=$(aws ec2 create-key-pair --key-name test-laravel)
echo $key_pair | jq -r ".KeyMaterial" > test-laravel.pem
chmod 400 test-laravel.pem
```

```bash
./node_modules/aws-cdk/bin/cdk deploy Network --require-approval never
./node_modules/aws-cdk/bin/cdk deploy EC2 --require-approval never
```

## Create Deploy CodePipeline

```bash
./node_modules/aws-cdk/bin/cdk deploy DeployPipeline --require-approval never
```

# Usage

```bash
ec2_ip=$(\
  aws cloudformation describe-stacks --stack-name EC2 \
   | jq -r '.Stacks[].Outputs[] | select(.OutputKey == "EC2IP").OutputValue')
echo ${ec2_ip}
```

## Access to ssh

```bash
ssh -i test-laravel.pem ec2-user@${ec2_ip}
```

## Access to https

```
https://${ec2_ip}
```
