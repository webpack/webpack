"use strict";

(global.__order || (global.__order = [])).push("stale-b:start");

const staleA = require("./stale-a");

module.exports = {
	seenName: staleA.name,
	seenKeys: Object.keys(staleA),
	aRef: staleA
};

global.__order.push("stale-b:end");
