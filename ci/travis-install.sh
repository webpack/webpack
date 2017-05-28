#!/bin/bash
set -ev

yarn link --frozen-lockfile || true && yarn link webpack --frozen-lockfile;

yarn --frozen-lockfile

