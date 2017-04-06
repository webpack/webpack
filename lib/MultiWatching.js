/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const asyncLib = require("async");

class MultiWatching {
	constructor(watchings, compiler) {
		this.watchings = watchings;
		this.compiler = compiler;
	}

	invalidate() {
		this.watchings.forEach((watching) => watching.invalidate());
	}

	close(callback) {
		if(callback === undefined) callback = () => { /*do nothing*/ };

		asyncLib.forEach(this.watchings, (watching, finishedCallback) => {
			watching.close(finishedCallback);
		}, err => {
			this.compiler.applyPlugins("watch-close");
			callback(err);
		});

	}
}

module.exports = MultiWatching;
