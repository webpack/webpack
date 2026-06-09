"use strict";

/** @typedef {{ run: number, options?: EXPECTED_ANY }} Config */

/**
 * @param {string} log log line
 * @param {Config} config config
 * @returns {string | undefined} error message
 */
const PERSISTENCE_CACHE_INVALIDATE_ERROR = (log, config) => {
	if (config.run < 2) return;
	const match =
		/^\[webpack\.cache\.PackFileCacheStrategy\] Pack got invalid because of write to:(.+)$/.exec(
			log
		);
	if (match) {
		return `Pack got invalid because of write to: ${match[1].trim()}`;
	}
};
const errorsFilter = [PERSISTENCE_CACHE_INVALIDATE_ERROR];

/**
 * @param {string[]} logs logs
 * @param {Config} config config
 * @returns {{ message: string }[]} errors
 */
module.exports = function filterInfraStructureErrors(logs, config) {
	/** @type {{ message: string }[]} */
	const results = [];
	for (const log of logs) {
		for (const filter of errorsFilter) {
			const result = filter(log, config);
			if (result) results.push({ message: result });
		}
	}
	return results;
};
