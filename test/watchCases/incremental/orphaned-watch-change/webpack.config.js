"use strict";

const assert = require("assert");
const path = require("path");

/** @type {import("../../../..").Configuration} */
module.exports = {
	plugins: [
		(compiler) => {
			const watchFileSystem = compiler.watchFileSystem;
			assert(watchFileSystem);
			const watch = watchFileSystem.watch.bind(watchFileSystem);
			const removedFile = path.join(compiler.context, "first.js");
			watchFileSystem.watch = (
				files,
				directories,
				missing,
				startTime,
				options,
				callback,
				callbackUndelayed
			) => {
				const watcher = watch(
					files,
					directories,
					missing,
					startTime,
					options,
					(error, fileTimes, contextTimes, changes, removals) => {
						if (removals) removals.delete(removedFile);
						callback(error, fileTimes, contextTimes, changes, removals);
					},
					callbackUndelayed
				);
				const getInfo = watcher.getInfo;
				assert(getInfo);
				watcher.getInfo = () => {
					const info = getInfo();
					if (info.removals) info.removals.delete(removedFile);
					return info;
				};
				return watcher;
			};
		}
	]
};
