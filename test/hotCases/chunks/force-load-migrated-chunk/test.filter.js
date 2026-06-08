"use strict";

// Force-loading a not-yet-loaded async chunk during an HMR update needs the
// web target's runtime; the node/webworker harness can't resolve the async
// chunk file mid-update.
module.exports = (config) => config.target === "web";
