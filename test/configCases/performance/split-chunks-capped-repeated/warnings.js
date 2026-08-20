"use strict";

module.exports = [
	[
		/split chunks capped/,
		// The queue refuses these dozens of times over; each survives once, most
		// modules first, and the list stops at five.
		/'g1' out of p0_js \(2 modules[\s\S]*'g1' out of second [\s\S]*'g2' out of p0_js \(2 modules, maxAsyncRequests is 1\)\nThe modules stayed/
	]
];
