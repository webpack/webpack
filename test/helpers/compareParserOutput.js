"use strict";

// What holds webpack's parser to acorn's: the first place two parse trees,
// comment lists or token streams disagree. Shared by the test262 corpus and by
// acorn's own test corpus, which ask the same question of different sources.

/**
 * A value as it reads in a difference report, kept short enough to scan.
 * @param {unknown} value either parser's value at the differing path
 * @returns {string} how the value prints
 */
const show = (value) => {
	if (typeof value === "bigint") return `${value}n`;
	if (value instanceof RegExp) return String(value);
	if (typeof value === "object" && value !== null) {
		return Array.isArray(value)
			? `[${value.length} items]`
			: `{${Object.keys(value).sort().join(",")}}`;
	}
	return JSON.stringify(value) || String(value);
};

/**
 * The first place two parse trees disagree, or null when they match. Key
 * presence is asked with `in`, since the lazy path serves `range` from a
 * prototype getter rather than an own property.
 * @param {unknown} ours what webpack's parser built
 * @param {unknown} theirs what acorn built
 * @param {string} at the path walked so far
 * @returns {{ at: string, ours: string, acorn: string } | null} the difference
 */
const firstDifference = (ours, theirs, at) => {
	if (ours === theirs) return null;
	const report = { at, ours: show(ours), acorn: show(theirs) };
	if (typeof ours !== typeof theirs) return report;
	if (typeof ours === "number") {
		return Number.isNaN(ours) && Number.isNaN(/** @type {number} */ (theirs))
			? null
			: report;
	}
	if (typeof ours === "bigint") {
		return String(ours) === String(theirs) ? null : report;
	}
	if (typeof ours !== "object" || ours === null || theirs === null) {
		return report;
	}
	if (ours instanceof RegExp || theirs instanceof RegExp) {
		return String(ours) === String(theirs) ? null : report;
	}
	if (Array.isArray(ours) !== Array.isArray(theirs)) return report;
	if (Array.isArray(ours)) {
		const other = /** @type {unknown[]} */ (theirs);
		if (ours.length !== other.length) return report;
		for (let i = 0; i < ours.length; i++) {
			const difference = firstDifference(ours[i], other[i], `${at}[${i}]`);
			if (difference) return difference;
		}
		return null;
	}
	const left = /** @type {Record<string, unknown>} */ (ours);
	const right = /** @type {Record<string, unknown>} */ (theirs);
	const ourKeys = Object.keys(left);
	const theirKeys = Object.keys(right);
	// Whichever side owns more keys covers the other: two same-sized key sets
	// that differ must each hold a key the other lacks.
	for (const key of ourKeys.length >= theirKeys.length ? ourKeys : theirKeys) {
		if (!(key in left)) {
			return { at: `${at}.${key}`, ours: "absent", acorn: show(right[key]) };
		}
		if (!(key in right)) {
			return { at: `${at}.${key}`, ours: show(left[key]), acorn: "absent" };
		}
		const difference = firstDifference(left[key], right[key], `${at}.${key}`);
		if (difference) return difference;
	}
	return null;
};

/**
 * The first few differences, with a count when more were found.
 * @template T
 * @param {T[]} differences everything the run collected
 * @param {number=} limit how many to keep
 * @returns {(T | string)[]} what the assertion prints
 */
const reportable = (differences, limit = 10) =>
	differences.length > limit
		? [
				...differences.slice(0, limit),
				`…and ${differences.length - limit} more`
			]
		: differences;

module.exports.firstDifference = firstDifference;
module.exports.reportable = reportable;
module.exports.show = show;
