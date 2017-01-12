/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const async = require("async");

class MultiWatching {
	constructor(watchings) {
		this.watchings = watchings;
	}

	invalidate() {
		this.watchings.forEach((watching) => watching.invalidate());
	}

	close(callback) {
		async.forEach(this.watchings, (watching, finishedCallback) => {
			watching.close(finishedCallback);
		}, callback);
	}
}

module.exports = MultiWatching;
