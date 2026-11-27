"use strict";

// Windows file names cannot hold the ":" the directory name has.
module.exports = () => process.platform !== "win32";
