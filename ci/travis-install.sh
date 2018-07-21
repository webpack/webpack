#!/bin/bash
set -ev

curl -o- -L https://yarnpkg.com/install.sh | bash -s -- --version 1.0.1

export PATH=$HOME/.yarn/bin:$PATH

yarn link --frozen-lockfile || true;

yarn --frozen-lockfile

yarn link webpack --frozen-lockfile
