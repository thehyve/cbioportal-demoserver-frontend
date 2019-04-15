#!/usr/bin/env bash

set -e 
set -u # unset variables throw error
set -o pipefail # pipes fail when partial command fails

build_and_run_database() {
    # create local database from with cbioportal db and seed data
    download_db_seed
    docker volume rm MYSQL_DATA_DIR 2> /dev/null || true
    docker stop $DB_HOST && docker rm $DB_HOST
    docker run -d \
        --name=$DB_HOST \
        --net=$network_name \
        -e MYSQL_ROOT_PASSWORD=$DB_USER \
        -e MYSQL_USER=$DB_USER \
        -e MYSQL_PASSWORD=$DB_PASSWORD \
        -e MYSQL_DATABASE=$DB_PORTAL_DB_NAME \
        -p 127.0.0.1:3306:3306 \
        -v "MYSQL_DATA_DIR:/var/lib/mysql/" \
        -v "/tmp/cgds.sql:/docker-entrypoint-initdb.d/cgds.sql:ro" \
        -v "/tmp/seed.sql.gz:/docker-entrypoint-initdb.d/seed_part1.sql.gz:ro" \
        mysql:5.7

    while ! docker run --rm --net=endtoendlocaldb_default mysql:5.7 mysqladmin ping -u $DB_USER -p$DB_PASSWORD -h$DB_HOST --silent; do
        echo Waiting for cbioportal database to initialize...
        sleep 10
    done
}

build_and_run_cbioportal() {

    curdir=$PWD
    
    cd /tmp
    rm -rf cbioportal
    git clone --depth 1 -b $BACKEND_BRANCH_NAME "https://github.com/$BACKEND_ORGANIZATION/cbioportal.git"
    (docker stop $E2E_CBIOPORTAL_HOST_NAME 2> /dev/null && docker rm $E2E_CBIOPORTAL_HOST_NAME  2> /dev/null) || true 
    cp $TEST_HOME/docker_images/* cbioportal
    cp $TEST_HOME/runtime-config/portal.properties cbioportal
    cd cbioportal
    # docker build -f Dockerfile.local -t cbioportal-backend-endtoend .
    docker rm cbioportal-endtoend-image 2> /dev/null || true
    docker build -f Dockerfile -t cbioportal-endtoend-image . \
        --build-arg FRONTEND_VERSION=$FRONTEND_COMMIT_HASH --build-arg FRONTEND_GROUPID=$FRONTEND_GROUPID

    # migrate database schema to most recent version
    echo Migrating database schema to most recent version ...
    docker run --rm \
        --net=$network_name \
        -v "$TEST_HOME/runtime-config/portal.properties:/cbioportal/portal.properties:ro" \
        cbioportal-endtoend-image \
        python3 /cbioportal/core/src/main/scripts/migrate_db.py -y -p /cbioportal/portal.properties -s /cbioportal/db-scripts/src/main/resources/migration.sql

    # start cbioportal
    docker run -d --restart=always \
        --name=$E2E_CBIOPORTAL_HOST_NAME \
        --net=$network_name \
        -e CATALINA_OPTS='-Xms2g -Xmx4g' \
        cbioportal-endtoend-image \
        catalina.sh jpda run

    cd $curdir
}

load_studies_in_db() {

    for DIR in $TEST_HOME/end-to-end-tests/local_database/studies/*/ ; do
        docker run --rm \
            --name=cbioportal-importer \
            --net=$network_name \
            -v "$TEST_HOME/runtime-config/portal.properties:/cbioportal/portal.properties:ro" \
            -v "$DIR:/study:ro" \
            cbioportal-endtoend-image \
            python3 /cbioportal/core/src/main/scripts/importer/metaImport.py \
            --url_server http://$E2E_CBIOPORTAL_HOST_NAME:8080 \
            --study_directory /study \
            --override_warning
    done

}

check_jitpack_download_frontend() {
    # check whether jitpack versions for the frontend exist
    url="https://jitpack.io/com/github/$FRONTEND_ORGANIZATION/cbioportal-frontend/$FRONTEND_COMMIT_HASH/cbioportal-frontend-$FRONTEND_COMMIT_HASH.jar"
    if !( curl -s --head $url | head -n 1 | egrep "HTTP/[0-9.]+ 200") ; then
        echo "Could not find frontend .jar (version: $FRONTEND_COMMIT_HASH, org: $FRONTEND_ORGANIZATION) at jitpack (url: $url)"
        exit 1
    fi
}

download_db_seed() {
    # download db schema and seed data
    curdir=$PWD
    cd /tmp
    curl https://raw.githubusercontent.com/cBioPortal/cbioportal/v2.0.0/db-scripts/src/main/resources/cgds.sql > cgds.sql
    curl https://raw.githubusercontent.com/cBioPortal/datahub/master/seedDB/seed-cbioportal_hg19_v2.7.3.sql.gz > seed.sql.gz
    cd $curdir
}

frontend_groupId="com.github.$FRONTEND_ORGANIZATION"
network_name=endtoendlocaldb_default

echo Check JitPack download of frontend code 
check_jitpack_download_frontend $FRONTEND_ORGANIZATION $FRONTEND_COMMIT_HASH
docker network create $network_name 2> /dev/null || true

echo Build and run database docker 
build_and_run_database

echo Build and run portal docker
build_and_run_cbioportal $BACKEND_BRANCH_NAME $BACKEND_ORGANIZATION $FRONTEND_COMMIT_HASH $frontend_groupId

echo Load test studies into database
load_studies_in_db

exit 0