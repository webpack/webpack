"use strict";

module.exports = [
	[
		// Only `lost.js`: `kept.js` passed its map on, and `plain.js` ran no
		// loader at all, so neither moved a position webpack could not follow.
		/missing source maps: 1 module was transformed by a loader that returned no source map/,
		/\n {2}\.\/lost\.js \(.*losing-loader\.js\)/
	]
];
