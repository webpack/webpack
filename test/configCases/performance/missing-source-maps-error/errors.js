"use strict";

module.exports = [
	[
		/missing source maps: 1 module was transformed by a loader that returned no source map/,
		/\n {2}\.\/lost\.js \(.*losing-loader\.js\)/
	]
];
