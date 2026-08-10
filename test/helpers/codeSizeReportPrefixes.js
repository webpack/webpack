"use strict";

/**
 * The row key each compiler of one case reports under. A config's `name` is not
 * unique — `hash-length/output-filename` has three sharing one — and a colliding
 * key overwrites a row, dropping a runtime from the report. A repeat takes an
 * `[index]` suffix, which a name can spell too (`foo`, `foo`, `foo[1]`), so a key
 * already taken widens until it is free.
 * @param {(string | undefined)[]} names each compiler's configured `name`
 * @returns {string[]} one prefix per compiler, unique and stable in config order
 */
const codeSizeReportPrefixes = (names) => {
	if (names.length === 1) return [""];
	/** @type {Map<string, number>} */
	const counts = new Map();
	for (const [index, name] of names.entries()) {
		const key = `${name || index}/`;
		counts.set(key, (counts.get(key) || 0) + 1);
	}
	/** @type {Set<string>} */
	const used = new Set();
	return names.map((name, index) => {
		const base = name || index;
		let prefix =
			/** @type {number} */ (counts.get(`${base}/`)) > 1
				? `${base}[${index}]/`
				: `${base}/`;
		while (used.has(prefix)) prefix = `${prefix.slice(0, -1)}[${index}]/`;
		used.add(prefix);
		return prefix;
	});
};

module.exports = codeSizeReportPrefixes;
