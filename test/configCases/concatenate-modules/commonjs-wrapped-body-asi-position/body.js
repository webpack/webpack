"use strict";

// semicolon-free: every require below opens a statement ASI would otherwise
// glue to the one above it
const log = require("./log")

log.push("body")
require("./side")
new require("./ctor")
require("./plain").member()

module.exports.report = () => log
