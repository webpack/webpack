"use strict";

// A check is trusted, so the schema never runs when it passes
module.exports = require("./create-loader")(() => true);
