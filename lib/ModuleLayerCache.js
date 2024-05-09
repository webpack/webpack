/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author @mknichel
*/

"use strict";

/** @type {WeakMap<Object, Map<string, string | Buffer>>} */
const weaklyHeldCaches = new WeakMap();

/**
 * Fetches a cached value if it exists or adds it to the cache and returns the
 * value. This is a weak cache, meaning that it will be collected as soon as
 * `associatedObjectForCache` is no longer reachable. This cache is useful
 * for storing information that could be shared by modules across different
 * layers. This can be useful for memory management since the same file that
 * appears in multiple layers may duplicate large strings, such as the contents
 * of the source file.
 *
 * @param {Object} associatedObjectForCache The object to associate the cached data with so that the data is collected when this object is no longer reachable.
 * @param {string} key The cache key for the value.
 * @param {string | Buffer} value The target value. This is used to see if the cached value is exactly the same or to add the value to the cache.
 * @returns {string | Buffer} The cached value if it exists and matches or the original value.
 */
function maybeUseCachedValue(associatedObjectForCache, key, value) {
	if (typeof associatedObjectForCache !== "object") {
		throw new Error("`associatedObjectForCache` must be an object");
	}
	if (!weaklyHeldCaches.has(associatedObjectForCache)) {
		weaklyHeldCaches.set(associatedObjectForCache, new Map());
	}
	const map = weaklyHeldCaches.get(associatedObjectForCache);
	if (map.has(key)) {
		const cachedValue = map.get(key);
		if (
			(Buffer.isBuffer(value) &&
				Buffer.isBuffer(cachedValue) &&
				value.equals(cachedValue)) ||
			value === cachedValue
		) {
			return cachedValue;
		}
	} else {
		map.set(key, value);
	}
	return value;
}
module.exports = maybeUseCachedValue;
