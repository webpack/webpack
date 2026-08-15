"use strict";

const fs = require("fs");
const path = require("path");

// A wrongly cased request resolves fine where the file system ignores case, so
// there is no failing request for a casing hint to be attached to. The repo
// always has a lower-case 'package.json'; the upper-cased name only exists
// where case is ignored.
module.exports = () =>
	!fs.existsSync(path.resolve(__dirname, "../../PACKAGE.JSON"));
