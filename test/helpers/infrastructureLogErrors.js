"use strict";

/** @typedef {{ run: number, options?: unknown }} Config */

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

// Filesystem cache store/restore failures are logged as warnings; surface them
// as errors so a broken disk cache fails the test instead of passing silently.
const PERSISTENCE_CACHE_FAILED_ERROR = (log) => {
	const match =
		/^\[webpack\.cache\.PackFileCacheStrategy\] (Caching failed for pack: .+|Restoring pack failed from .+|Restoring failed for .+ from pack: .+|Restoring pack from .+ failed: .+|Skipped not serializable cache item .+)$/.exec(
			log
		);
	if (match) {
		return match[1].trim();
	}
};

const errorsFilter = [
	PERSISTENCE_CACHE_INVALIDATE_ERROR,
	PERSISTENCE_CACHE_FAILED_ERROR
];

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
