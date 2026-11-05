"use strict";

// "\" is the path separator on Windows, so no file name there holds one.
module.exports = () => process.platform !== "win32";
