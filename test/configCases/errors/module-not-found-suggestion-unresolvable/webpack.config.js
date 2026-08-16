"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.js",
	// Nothing may resolve to 'Legacy.js', which the suggestion has to respect
	// even though no lookup consults this option
	resolve: { restrictions: [/^(?!.*Legacy).*$/] }
};
