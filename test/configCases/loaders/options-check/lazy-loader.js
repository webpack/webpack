"use strict";

// Passes a function returning the schema, which only a failing check calls
module.exports = require("./create-loader")(require("./check"), true);
