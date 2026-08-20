"use strict";

module.exports = [
	[
		/split chunks capped/,
		// `a_js`/`b_js` are chunk ids: no `webpackChunkName` named those groups.
		/'v' out of a_js \(2 modules, maxAsyncRequests is 1\)\n {2}cacheGroup 'v' out of b_js[\s\S]*'v' out of second /
	]
];
