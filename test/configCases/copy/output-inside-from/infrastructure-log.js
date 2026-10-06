"use strict";

// The default build copies its output directory, so a second build also copies
// what the first emitted there: new files to cache, which is the behavior under
// test rather than work redone. The builds ignoring that directory write nothing.
module.exports = (options) => {
	const [first] = Array.isArray(options) ? options : [options];
	if (first.cache && first.cache.type === "filesystem") {
		return [
			/^Pack got invalid because of write to: CopyPlugin\|.*-default\/static\/build\//
		];
	}

	return [];
};
