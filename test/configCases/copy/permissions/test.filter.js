"use strict";

// Windows has no permission bits to keep — `chmod` there toggles read-only alone
module.exports = () => process.platform !== "win32";
