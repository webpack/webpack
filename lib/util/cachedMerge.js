/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const mergeCache = new WeakMap();

const cachedMerge = (first, ...args) => {
	if (args.length === 0) return first;
	if (args.length > 1) {
		return cachedMerge(first, cachedMerge(...args));
	}
	const second = args[0];
	let innerCache = mergeCache.get(first);
	if (innerCache === undefined) {
		innerCache = new WeakMap();
		mergeCache.set(first, innerCache);
	}
	const cachedMerge = innerCache.get(second);
	if (cachedMerge !== undefined) return cachedMerge;
	const newMerge = Object.assign({}, first, second);
	innerCache.set(second, newMerge);
	return newMerge;
};

module.exports = cachedMerge;
