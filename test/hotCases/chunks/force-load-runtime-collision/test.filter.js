"use strict";

// Force-loading the merged async chunk during an update needs the web target's
// runtime (node/webworker harness can't resolve the async chunk file mid-update).
module.exports = (config) => config.target === "web";
