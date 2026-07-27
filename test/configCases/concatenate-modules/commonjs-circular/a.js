"use strict";

(global.__order || (global.__order = [])).push("a:start");

// reassigned *before* the cycle re-enters, so `b` observes this object
module.exports = { name: "a" };

const b = require("./b");

module.exports.b = b;

global.__order.push("a:end");
