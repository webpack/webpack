"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/**
 * @this {import("./webpack.config").WatchLoaderContext}
 * @param {string} source module source
 * @returns {void}
 */
module.exports = function interruptBuild(source) {
	const callback = this.async();
	const events = this.watchEvents;
	const step = currentWatchStep.step;
	if (!events || (step !== "1" && step !== "2") || events.interrupted.has(step)) {
		return callback(null, source);
	}
	events.interrupted.add(step);
	const compiler = this._compiler;
	assert(compiler && compiler.watching);
	const watching = compiler.watching;
	const watcher = watching.pausedWatcher;
	assert(watcher && watcher.getInfo);
	const getInfo = watcher.getInfo;
	const before = getInfo().fileTimeInfoEntries;
	const changedFiles = [this.resourcePath];
	/** @returns {void} request another build before this loader completes */
	const invalidate = () => {
		if (compiler.inputFileSystem && compiler.inputFileSystem.purge) {
			compiler.inputFileSystem.purge();
		}
		watching.invalidate((error) => {
			expect(error).toBeFalsy();
			events.callbacks++;
		});
	};
	if (step === "1") {
		fs.copyFileSync(
			path.join(this.rootContext, "update/value.js"),
			this.resourcePath
		);
		invalidate();
	} else {
		changedFiles.push(path.join(this.rootContext, "index.js"));
		for (const file of ["index.js", "added.js"]) {
			fs.copyFileSync(
				path.join(this.rootContext, "first", file),
				path.join(this.rootContext, file)
			);
		}
		fs.unlinkSync(this.resourcePath);
		invalidate();
		fs.copyFileSync(
			path.join(this.rootContext, "second/added.js"),
			path.join(this.rootContext, "added.js")
		);
		invalidate();
	}
	// Keep the build in flight until the watcher observes the loader's edits.
	const deadline = Date.now() + 5000;
	/** @returns {void} complete after the pending filesystem notifications */
	const waitForChanges = () => {
		const after = getInfo().fileTimeInfoEntries;
		if (changedFiles.every((file) => before.get(file) !== after.get(file))) {
			return callback(null, source);
		}
		if (Date.now() >= deadline) {
			return callback(new Error("The watcher did not observe the loader's edits"));
		}
		setTimeout(waitForChanges, 10);
	};
	waitForChanges();
};
