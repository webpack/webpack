"use strict";

/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
*/

const asyncLib = require("neo-async");

/** @typedef {import("./MultiCompiler")} MultiCompiler */
/** @typedef {import("./Watching")} Watching */
/** @typedef {import("./webpack").ErrorCallback} ErrorCallback */

class MultiWatching {
	/**
	 * Creates a MultiWatching instance
	 * @param {Watching[]} watchings List of watching instances
	 * @param {MultiCompiler} compiler Compiler instance
	 */
	constructor(watchings, compiler) {
		this.watchings = watchings || [];
		this.compiler = compiler || null;
	}

	/**
	 * Invalidates all watchers
	 * @param {ErrorCallback=} callback Callback after invalidation
	 */
	invalidate(callback) {
		if (typeof callback === "function") {
			asyncLib.each(
				this.watchings,
				(watching, cb) => watching.invalidate(cb),
				(err) => {
					callback(err || null);
				}
			);
		} else {
			for (const watching of this.watchings) {
				watching.invalidate();
			}
		}
	}

	/**
	 * Suspends all watchers
	 */
	suspend() {
		for (const watching of this.watchings) {
			watching.suspend();
		}
	}

	/**
	 * Resumes all watchers
	 */
	resume() {
		for (const watching of this.watchings) {
			watching.resume();
		}
	}

	/**
	 * Closes all watchers
	 * @param {ErrorCallback} callback Callback after closing
	 */
	close(callback) {
		asyncLib.each(
			this.watchings,
			(watching, finishedCallback) => watching.close(finishedCallback),
			(err) => {
				if (this.compiler && this.compiler.hooks) {
					this.compiler.hooks.watchClose.call();
				}
				if (typeof callback === "function") {
					if (this.compiler) this.compiler.running = false;
					callback(err || null);
				}
			}
		);
	}

	/**
	 * Returns status of watchers
	 * @returns {string[]} Array of watcher status strings
	 */
	status() {
		return this.watchings.map(
			(w, i) => `Watcher ${i}: ${w.running ? "running" : "stopped"}`
		);
	}
}

module.exports = MultiWatching;
