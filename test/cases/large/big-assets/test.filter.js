"use strict";

// Only run in the normal suite in CI — source-map and other suites
// multiply output size and exhaust CI disk space (ENOSPC).
module.exports = (config) => !process.env.CI || config.name === "normal";
