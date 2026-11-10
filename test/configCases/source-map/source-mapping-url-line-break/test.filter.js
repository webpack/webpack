"use strict";

// Windows file names cannot hold a line break, which the chunk name puts there.
module.exports = () => process.platform !== "win32";
