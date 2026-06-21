"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// the node Worker resolver uses `process.getBuiltinModule` (Node >= 22.3)
module.exports = () =>
	supportsWorker() && typeof process.getBuiltinModule === "function";
