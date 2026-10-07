"use strict";

// requires the concatenation root, which stays hoisted and is evaluated last
const root = require("./index");

global.__cycleSaw = root.rootValue;

module.exports = { seen: root.rootValue };
