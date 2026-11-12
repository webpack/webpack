"use strict";

const { callsOf, recordFunction } = require("../_shared/record");

// An `extractComments` predicate extracting nothing; its check reports the
// comment, line and column it was handed for each comment.
const extractNone = recordFunction(() => false);

module.exports = { check: callsOf({ extractNone }), extractNone };
