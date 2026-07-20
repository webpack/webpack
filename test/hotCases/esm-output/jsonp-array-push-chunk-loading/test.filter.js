"use strict";

// jsonp chunk loading and the fetch-based manifest download need the web
// target's simulated `document`/`fetch`.
module.exports = (config) => config.target === "web";
