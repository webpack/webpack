"use strict";

// Windows file names cannot hold `*`
module.exports = () => process.platform !== "win32";
