"use strict";

// A stale check rejects options the schema accepts
module.exports = require("./create-loader")(() => false);
