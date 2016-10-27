#!/bin/bash
set -ev

if [ "$TRAVIS_NODE_VERSION" == "v0.12.17" ];
then npm install && npm link && npm link webpack;
else npm install yarn -g && yarn install && yarn link || true && yarn link webpack;
fi