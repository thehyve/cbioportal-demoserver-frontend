#!/usr/bin/env bash

set -e

usage() {
    echo "Build docker with cbioportal backend specified in the pull request or a reference (master/rc) cbioportal backend."
    echo "To run with reference backend provide the -r flag to this script."
    echo "Example: ./setup.sh -r"
}

use_reference_backend=false

while getopts "r" opt; do
  case "${opt}" in
    r) use_reference_backend=true
    ;;
    \?) usage; exit 1
    ;;
  esac
done

# evaluate the pull request number
if [[ -z "$CIRCLE_PR_NUMBER" ]]; then
    if [[ "$CIRCLE_PULL_REQUEST" =~ \/([0-9]+)$ ]] ; then
        export CIRCLE_PR_NUMBER=${BASH_REMATCH[1]}
    else
        echo "Error: could not identify pull request number (CIRCLE_PULL_REQUEST: '$CIRCLE_PULL_REQUEST')."
        exit 1
    fi
fi

echo "Retrieving pull request information (CIRCLE_PR_NUMBER: '$CIRCLE_PR_NUMBER'):"
python3 get_pullrequest_info.py $CIRCLE_PR_NUMBER && echo
eval "$(python3 get_pullrequest_info.py $CIRCLE_PR_NUMBER)"
# retrieves
    # FRONTEND_BRANCH_NAME          ->  (e.g. 'superawesome_feature_branch')
    # FRONTEND_COMMIT_HASH          ->  (e.g. '3as8sAs4')
    # FRONTEND_ORGANIZATION         ->  (e.g. 'thehyve')
    # FRONTEND_REPO_NAME            ->  (e.g. 'cbioportal-frontend')
    # FRONTEND_BASE_BRANCH_NAME     ->  (e.g. 'rc')
    # FRONTEND_BASE_COMMIT_HASH     ->  (e.g. '34hh9jad')
    # FRONTEND_BASE_ORGANIZATION    ->  (e.g. 'cbioportal')
    # FRONTEND_BASE_REPO_NAME       ->  (e.g. 'cbioportal-frontend)
    # BACKEND_ORGANIZATION          ->  (e.g. 'cbioportal')
    # BACKEND_BRANCH_NAME           ->  (e.g. 'rc')

echo "Read portal.properties for local database connection:"
python3 read_portalproperties.py portal.properties && echo
eval "$(python3 read_portalproperties.py portal.properties)"
# retrieves
    # DB_USER                       ->  (e.g. 'cbio_user')
    # DB_PASSWORD                   ->  (e.g. 'cbio_pass')
    # DB_PORTAL_DB_NAME             ->  (e.g. 'endtoend_local_cbiodb')
    # DB_CONNECTION_STRING          ->  (e.g. 'jdbc:mysql://cbiodb-endtoend:3306/')
    # DB_HOST                       ->  (e.g. 'cbiodb-endtoend')

if [[ "$use_reference_backend" == true ]]; then
    backend_branch_name=$FRONTEND_BASE_BRANCH_NAME
    backend_organization="cbioportal"
else
    if [[ -z $BACKEND_ORGANIZATION ]] || [[ -z $BACKEND_BRANCH_NAME ]]; then
        echo "Error: information on the specified backend branch could not be retrieved."
        echo "Make sure to include 'BACKEND_BRANCH=<org>:<name>'' in the pull request text where '<org>' is the organization (e.g. cbioportal) and '<name>' is the name of the backend branch."
        exit 1
    fi
fi

export E2E_CBIOPORTAL_HOST_NAME="cbioportale2e"

../docker/setup_dockers.sh

exit