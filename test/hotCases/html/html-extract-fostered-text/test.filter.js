"use strict";

// DOM patching is only meaningful in the web target — node/worker have no
// `document` to patch.
module.exports = (config) => config.target === "web";
