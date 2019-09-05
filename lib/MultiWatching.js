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

	suspend() {
		for (const watching of this.watchings) {
			watching.suspend();
		}
	}

	resume() {
		for (const watching of this.watchings) {
			watching.resume();
		}
	}

	_closeOnError(err, callback) {
		this.compiler.hooks.watchClose.call();
		if (typeof callback === "function") {
			this.compiler.running = false;
			callback(err);
		}
	}

	close(callback) {
		asyncLib.forEach(
			this.watchings,
			(watching, finishedCallback) => {
				watching.close(finishedCallback);
			},
			err => {
				this._closeOnError(err, callback);
			}
		);
	}

	kill(callback) {
		asyncLib.forEach(
			this.watchings,
			(watching, finishedCallback) => {
				watching.kill(finishedCallback);
			},
			err => {
				this._closeOnError(err, callback);
			}
		);
	}
}

module.exports = MultiWatching;
