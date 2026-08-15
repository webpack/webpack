"use strict";

const fs = require("fs");
const path = require("path");

// A case-only mismatch resolves fine on a case-insensitive filesystem,
// so there is no failing request to hint about there.
module.exports = () => !fs.existsSync(path.resolve(__dirname, "BUTTON.js"));
