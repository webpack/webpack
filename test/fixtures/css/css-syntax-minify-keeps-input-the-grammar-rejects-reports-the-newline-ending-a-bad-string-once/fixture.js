"use strict";

const { callsOf, recordFunction } = require("../_shared/record");

// A `parseError` callback doing nothing; its check reports each parse error
// the print handed it.
const parseError = recordFunction(() => {});

module.exports = { check: callsOf({ parseError }), parseError };
