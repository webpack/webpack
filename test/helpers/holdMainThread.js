"use strict";

/**
 * Spins on the monotonic clock, which `performance.hotspots` measures with.
 * `Date.now()` follows the wall clock: a step in it on a runner ends a spin
 * early, and the hotspot then reads shorter than it was meant to be.
 * @param {number} ms how long to hold the main thread
 * @returns {void}
 */
module.exports = (ms) => {
	const start = process.hrtime();
	let elapsed = 0;

	while (elapsed < ms) {
		const [seconds, nanoseconds] = process.hrtime(start);

		elapsed = seconds * 1000 + nanoseconds / 1e6;
	}
};
