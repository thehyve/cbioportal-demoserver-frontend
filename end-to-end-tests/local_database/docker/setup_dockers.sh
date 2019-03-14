#!/usr/bin/env bash

set -e 
set -u # unset variables throw error
set -o pipefail # pipes fail when partial command fails

usage() {
    echo "Build docker with cbioportal backend specified in the pull request or a reference (master/rc) cbioportal backend."
    echo "Pass a filename with environmental variables via the -e parameter."
    echo "Example: ./setup_dockers.sh -e /tmp/env_vars.sh"
}

while getopts "e:" opt; do
  case "${opt}" in
    r) env_vars_filename=true
    ;;
    \?) usage; exit 1
    ;;
  esac
done

source env_vars_filename

build_and_run_database() {
    # create local database from with cbioportal db and seed data
    download_db_seed
    docker volume rm MYSQL_DATA_DIR 2> /dev/null || true
    docker stop $DB_HOST && docker rm $DB_HOST
    docker run -d \
        --name=$DB_HOST \
        --net=endtoendlocaldb_default \
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
    git clone --depth 1 -b $BACKEND_BRANCH_NAMe "https://github.com/$BACKEND_ORGANIZATION/cbioportal.git"
    (docker stop $E2E_CBIOPORTAL_HOST_NAME 2> /dev/null && docker rm $E2E_CBIOPORTAL_HOST_NAME  2> /dev/null) || true 
    cp $TEST_HOME/docker_images/* cbioportal
    cp $TEST_HOME/runtime-config/portal.properties cbioportal
    cd cbioportal
    export FRONTEND_VERSION=$FRONTEND_COMMIT_HASH
    export FRONTEND_GROUPID=$FRONTEND_GROUPID
    # docker build -f Dockerfile.local -t cbioportal-backend-endtoend .
    docker rm cbioportal-endtoend-image 2> /dev/null || true
    docker build -f Dockerfile -t cbioportal-endtoend-image . --build-arg FRONTEND_VERSION --build-arg FRONTEND_GROUPID

    # migrate database schema to most recent version
    echo Migrating database schema to most recent version ...
    docker run --rm \
        --net=endtoendlocaldb_default \
        -v "$TEST_HOME/runtime-config/portal.properties:/cbioportal/portal.properties:ro" \
        cbioportal-endtoend-image \
        python3 /cbioportal/core/src/main/scripts/migrate_db.py -y -p /cbioportal/portal.properties -s /cbioportal/db-scripts/src/main/resources/migration.sql

    # start cbioportal
    docker run -d --restart=always \
        --name=$E2E_CBIOPORTAL_HOST_NAME \
        --net=endtoendlocaldb_default \
        -e CATALINA_OPTS='-Xms2g -Xmx4g' \
        -p 127.0.0.1:8000:8000 \
        -p 8081:8080 \
        cbioportal-endtoend-image \
        catalina.sh jpda run

    cd $curdir
}

load_studies_in_db() {

    for DIR in $TEST_HOME/end-to-end-tests/studies/*/ ; do
        docker run --rm \
            --name=cbioportal-importer \
            --net=endtoendlocaldb_default \
            -v "$TEST_HOME/runtime-config/portal.properties:/cbioportal/portal.properties:ro" \
            -v "$DIR:/study:ro" \
            -v "$DIR:/outdir" \
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
    if !( curl -s --head $url | head -n 1 | grep "HTTP/2 200") ; then
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

check_jitpack_download_frontend $FRONTEND_ORGANIZATION $FRONTEND_COMMIT_HASH
build_and_run_database
build_and_run_cbioportal $BACKEND_BRANCH_NAME $BACKEND_ORGANIZATION $FRONTEND_COMMIT_HASH $frontend_groupId
load_studies_in_db

exit