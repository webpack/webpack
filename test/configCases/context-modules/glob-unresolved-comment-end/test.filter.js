"use strict";

// Windows file names cannot hold "*" or "?".
module.exports = () => process.platform !== "win32";
