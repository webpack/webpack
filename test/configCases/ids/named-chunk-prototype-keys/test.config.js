"use strict";

module.exports = {
	findBundle(i) {
		return [`./${["node", "async-node", "webworker"][i]}-main.js`];
	}
};
