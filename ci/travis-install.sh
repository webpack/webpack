#!/bin/bash
set -ev
set NODEV = $(node -v)

if [ $NODEV:0:1 == "0.12" ];
then npm install && npm link && npm link webpack;
else npm install yarn -g && yarn install && yarn link || true && yarn link webpack;
fi