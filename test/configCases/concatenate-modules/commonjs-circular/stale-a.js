"use strict";

(global.__order || (global.__order = [])).push("stale-a:start");

const staleB = require("./stale-b");

// reassigned *after* the cycle re-entered, so `stale-b` is left holding the
// original (empty) exports object
module.exports = { name: "stale-a", staleB };

global.__order.push("stale-a:end");
