"use strict";

/**
 * Removes chunks of a failing sequence while preserving its failure.
 * @template T
 * @param {T[]} sequence original operations
 * @param {(candidate: T[]) => Promise<boolean>} fails whether a replay reproduces the failure
 * @returns {Promise<T[]>} sequence where no single operation can be removed
 */
const minimizeWatchSequence = async (sequence, fails) => {
	let result = [...sequence];
	let partitions = 2;
	while (result.length > 0) {
		const size = Math.ceil(result.length / partitions);
		let reduced = false;
		for (let start = 0; start < result.length; start += size) {
			const candidate = [
				...result.slice(0, start),
				...result.slice(start + size)
			];
			if (await fails(candidate)) {
				result = candidate;
				partitions = Math.max(2, partitions - 1);
				reduced = true;
				break;
			}
		}
		if (!reduced) {
			if (partitions >= result.length) break;
			partitions = Math.min(result.length, partitions * 2);
		}
	}
	return result;
};

module.exports = minimizeWatchSequence;
