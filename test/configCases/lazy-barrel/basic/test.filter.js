"use strict";

// Node v16 doesn't support recursive readdir
module.exports = () => !process.version.startsWith("v16");
