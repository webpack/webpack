/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import asyncLib from "neo-async";
/** @typedef {import("./MultiCompiler.js").default} MultiCompiler */
/** @typedef {import("./Watching.js").default} Watching */
/** @typedef {import("./webpack.js").ErrorCallback} ErrorCallback */

class MultiWatching {
	/**
	 * Creates an instance of MultiWatching.
	 * @param {Watching[]} watchings child compilers' watchers
	 * @param {MultiCompiler} compiler the compiler
	 */
	constructor(watchings, compiler) {
		/** @type {Watching[]} */
		this.watchings = watchings;
		/** @type {MultiCompiler} */
		this.compiler = compiler;
	}

	/**
	 * Processes the provided error callback.
	 * @param {ErrorCallback=} callback signals when the build has completed again
	 * @returns {void}
	 */
	invalidate(callback) {
		if (callback) {
			asyncLib.each(
				this.watchings,
				(watching, callback) => watching.invalidate(callback),
				(err) => {
					callback(/** @type {Error | null} */ (err));
				}
			);
		} else {
			for (const watching of this.watchings) {
				watching.invalidate();
			}
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

	/**
	 * Processes the provided error callback.
	 * @param {ErrorCallback} callback signals when the watcher is closed
	 * @returns {void}
	 */
	close(callback) {
		asyncLib.each(
			this.watchings,
			(watching, finishedCallback) => {
				watching.close(finishedCallback);
			},
			(err) => {
				this.compiler.hooks.watchClose.call();
				if (typeof callback === "function") {
					this.compiler.running = false;
					callback(/** @type {Error | null} */ (err));
				}
			}
		);
	}
}

export default MultiWatching;

export { MultiWatching as "module.exports" };
