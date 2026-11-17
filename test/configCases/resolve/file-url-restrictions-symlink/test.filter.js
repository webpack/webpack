"use strict";

// creating a symbolic link needs extra rights on Windows
module.exports = () => process.platform !== "win32";
