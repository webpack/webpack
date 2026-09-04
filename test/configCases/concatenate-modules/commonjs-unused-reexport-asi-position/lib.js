"use strict";

// semicolon-free re-exports, in every spelling: dropping the unused ones must
// not let the remaining expressions bind to the next statement
module.exports.Type = require("./type")
module.exports.Schema = require("./schema")
module.exports.CORE_SCHEMA = require("./defaults").core
exports.FAILSAFE_SCHEMA = require("./failsafe")
Object.defineProperty(exports, "JSON_SCHEMA", { value: require("./json") })
module.exports.load = () => "loaded"
