"use strict";

module.exports = ["a", "b"].map((name) => ({
	name,
	output: { clean: false, filename: `bundle-${name}.js` }
}));
