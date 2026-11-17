"use strict";

// a `:` cannot be part of a file name on Windows
module.exports = () => process.platform !== "win32";
