"use strict";

const { callsOf, recordFunction } = require("../_shared/record");

// A predicate a print set hands `transforms.comments`; its check reports the
// comments it was asked about and what it answered.
const keepLicense = recordFunction((comment) => comment.includes("@license"));

module.exports = { check: callsOf({ keepLicense }), keepLicense };
