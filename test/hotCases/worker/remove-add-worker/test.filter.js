"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// TODO Bun's fake Worker (test/helpers/createFakeWorker.js) delivers messages on
// a different microtask turn than V8, so the runtime add/remove HMR hangs.
module.exports = (config) =>
	supportsWorker() && config.target !== "async-node" && !process.versions.bun;
