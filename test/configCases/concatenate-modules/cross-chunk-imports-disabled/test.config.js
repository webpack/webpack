"use strict";

module.exports = {
	findBundle(i) {
		return [i === 2 ? "bundle2.js" : `bundle${i}.mjs`];
	}
};
