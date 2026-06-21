"use strict";

const supportsBlob = require("../../../helpers/supportsBlob");
const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = () => supportsWorker() && supportsBlob();

const _denoOrigFilter = module.exports;

// Under Deno the fake worker_threads worker rejects an in-worker chunk load
// (a blob:/data:/custom-publicPath URL it cannot map) asynchronously after the
// case finished, surfacing as an uncaught error that fails a later case.
module.exports = (...args) =>
	!process.versions.deno && _denoOrigFilter(...args);
