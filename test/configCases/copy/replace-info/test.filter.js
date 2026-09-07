"use strict";

// Windows has no permission bits to preserve.
module.exports = () => process.platform !== "win32";
