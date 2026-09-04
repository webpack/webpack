"use strict";

// semicolon-free re-exports: dropping the unused ones must not let the
// remaining expressions bind to the next statement
module.exports.Type = require("./type")
module.exports.Schema = require("./schema")
module.exports.CORE_SCHEMA = require("./defaults").core
module.exports.load = () => "loaded"
