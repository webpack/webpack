/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const mergeCache = new WeakMap();

const cachedMerge = (first, second) => {
	let innerCache = mergeCache.get(first);
	if (innerCache === undefined) {
		innerCache = new WeakMap();
		mergeCache.set(first, innerCache);
	}
	const prevMerge = innerCache.get(second);
	if (prevMerge !== undefined) return prevMerge;
	const newMerge = Object.assign({}, first, second);
	innerCache.set(second, newMerge);
	return newMerge;
};

module.exports = cachedMerge;
