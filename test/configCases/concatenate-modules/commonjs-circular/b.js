"use strict";

(global.__order || (global.__order = [])).push("b:start");

const a = require("./a");

module.exports = { name: `a from b: ${a.name}`, aRef: a };

global.__order.push("b:end");
