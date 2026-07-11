"use strict";

const fs = require("node:fs");
const path = require("node:path");

module.exports = () => fs.existsSync(path.join(__dirname, "TEST.FILTER.JS"));
