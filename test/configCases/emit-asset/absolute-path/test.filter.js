"use strict";

// Only Windows joins paths in a way that makes an absolute targetFile invalid.
module.exports = () => process.platform === "win32";
