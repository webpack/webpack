"use strict";

// HOLD delays JSONP scripts, which only the `web` target loads asynchronously here.
module.exports = (config) => config.target === "web";
