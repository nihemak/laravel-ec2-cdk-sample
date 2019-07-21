#!/bin/bash

DESTINATION_PATH="/tmp/test_laravel"
DEPLOY_PATH="/usr/share/nginx/html/test-laravel"

# Setup EC2
ansible-playbook -i localhost, -c local ${DESTINATION_PATH}/infra/setup_ec2.yml

cd ${DEPLOY_PATH} || exit 99

TIMESTAMP=$(date +%s)

# Create work dir
mkdir -p "./releases/${TIMESTAMP}"

# Deploy to work dir
ln -nfs "${DEPLOY_PATH}/releases/${TIMESTAMP}" ./release
cp -arf ${DESTINATION_PATH}/laravel/* ./release/

chown -R nginx ./*

cd ./release || exit 99

# Symbolically link undeployment files
rm -f .env
ln -nfs ${DEPLOY_PATH}/.env ./.env
chown -h nginx ./.env
rm -rf ./storage
ln -nfs ${DEPLOY_PATH}/shared/storage ./storage
chown -h nginx ./storage

php artisan storage:link
php artisan view:clear
php artisan cache:clear
composer dump-autoload --optimize

cd ../ || exit 99

# Switch current dir from work dir
ln -nfs "${DEPLOY_PATH}/releases/${TIMESTAMP}" ./current
unlink ./release

# Restart and apply php-fpm/nginx
systemctl restart php-fpm.service
systemctl restart nginx.service
