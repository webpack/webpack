"use strict";

const { callsOf, recordFunction } = require("../_shared/record");

// A `transforms.comments` predicate keeping nothing, the pragma included.
const keepNone = recordFunction(() => false);

module.exports = { check: callsOf({ keepNone }), keepNone };
