"use strict";

const fs = require("fs");
const path = require("path");

module.exports = () => fs.existsSync(path.join(__dirname, "TEST.FILTER.JS"));
