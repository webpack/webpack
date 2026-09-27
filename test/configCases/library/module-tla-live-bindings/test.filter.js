"use strict";

// Native top-level await is required when the harness imports the library.
module.exports = () => Number(process.versions.node.split(".")[0]) >= 14;
