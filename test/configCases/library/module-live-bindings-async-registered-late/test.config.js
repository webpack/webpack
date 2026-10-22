"use strict";

module.exports = {
	findBundle(index) {
		return index % 2
			? [`${index}/runtime.mjs`, `${index}/main.mjs`]
			: `${index}/main.mjs`;
	}
};
