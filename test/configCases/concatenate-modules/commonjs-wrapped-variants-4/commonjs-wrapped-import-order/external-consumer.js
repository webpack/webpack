"use strict";

// require.resolve can't be concatenated, so it keeps "external-side-effect"
// outside the concatenation; the lazy require() below still wraps it
exports.resolved = typeof require.resolve("./external-side-effect");

global.__externalOrder = (global.__externalOrder || []).concat(
	"external-consumer"
);

exports.read = function read() {
	return require("./external-side-effect").tag;
};
