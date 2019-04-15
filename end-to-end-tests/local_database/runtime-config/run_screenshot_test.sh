#!/usr/bin/env bash

CUR_DIR=$PWD

cd $TEST_HOME/local_database/docker
docker build -f Dockerfile.screenshottest -t cbioportal:screenshot $PORTAL_SOURCE_DIR

docker run cbioportal:screenshot

cd $CUR_DIR
exit 0