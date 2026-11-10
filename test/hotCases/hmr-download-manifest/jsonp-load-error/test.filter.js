"use strict";

// Only the `web` target downloads the manifest with fetch.
module.exports = (config) => config.target === "web";
