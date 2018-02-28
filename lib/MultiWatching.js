/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const asyncLib = require("neo-async");

class MultiWatching {
	constructor(watchings, compiler) {
		this.watchings = watchings;
		this.compiler = compiler;
	}

	invalidate() {
		for (const watching of this.watchings) {
			watching.invalidate();
		}
	}

	close(callback) {
		asyncLib.forEach(
			this.watchings,
			(watching, finishedCallback) => {
				watching.close(finishedCallback);
			},
			err => {
				this.compiler.hooks.watchClose.call();
				if (typeof callback === "function") {
					callback(err);
				}
			}
		);
	}
}

module.exports = MultiWatching;
