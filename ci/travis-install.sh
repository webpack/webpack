#!/bin/bash
set -ev

yarn link || true && yarn link webpack;

