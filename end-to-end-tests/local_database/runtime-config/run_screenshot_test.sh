#!/usr/bin/env bash

CUR_DIR=$PWD

cd $PORTAL_HOME/end-to-end-tests/local_database/docker
docker build -f Dockerfile.screenshottest -t cbioportal:screenshot .

docker run cbioportal:screenshot

cd $CUR_DIR
exit 0