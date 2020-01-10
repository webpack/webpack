/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

/** @typedef {import("./Compilation")} Compilation */

/**
 * @type {WeakMap<Compilation, Object<string, {entries: Set<string>, total: number, done: number, callbacks: {onSuccess: function[]}}>>}
 */
const entryStateMap = new WeakMap();

exports.registerCompilation = compilation => {
	let compilationData = entryStateMap.get(compilation);

	if (compilationData) {
		return;
	}

	compilationData = Object.create(null);
	entryStateMap.set(compilation, compilationData);

	compilation.hooks.succeedEntry.tap("ProgressPlugin", (dep, name, module) => {
		let entryData = compilationData[name];

		if (entryData) {
			entryData.done++;

			if (entryData.total === entryData.done) {
				for (const callback of entryData.callbacks.onSuccess) {
					callback();
				}
			}
		}
	});
};

exports.registerEntry = (compilation, name, entry) => {
	exports.registerCompilation(compilation);

	let compilationData = entryStateMap.get(compilation);
	let entryData = compilationData[name];

	if (!entryData) {
		entryData = compilationData[name] = {
			callbacks: {
				onSuccess: []
			},
			entries: new Set(),
			total: 0,
			done: 0
		};
	}

	if (entry && !entryData.entries.has(entry)) {
		entryData.total++;
		entryData.entries.add(entry);
	}
};

exports.onEntrySuccess = (compilation, name, callback) => {
	let compilationData = entryStateMap.get(compilation);
	let entryData = compilationData[name];

	if (!entryData) {
		throw new TypeError(`Unknown entrypoint: ${name}`);
	}

	if (callback && !entryData.callbacks.onSuccess.includes(callback)) {
		entryData.callbacks.onSuccess.push(callback);
	}
};
