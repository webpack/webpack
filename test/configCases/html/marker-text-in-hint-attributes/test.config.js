"use strict";

module.exports = {
	// The page is the entry, so the assertions run from an asset emitted beside
	// it, in each build's own directory.
	findBundle(i, options) {
		return [`./${options.name}/test.js`];
	}
};
