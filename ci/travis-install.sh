#!/bin/bash
set -ev

npm install yarn -g && yarn install && yarn link || true && yarn link webpack;

