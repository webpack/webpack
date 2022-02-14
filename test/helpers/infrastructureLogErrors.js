"use strict";

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

const checkErrors = (logs, config) => {
	const results = [];
	for (const log of logs) {
		for (const filter of errorsFilter) {
			const result = filter(log, config);
			if (result) results.push(result);
		}
	}
	return results;
};

/**
 * @param {{[k: string]: {[k: string]: RegExp|RegExp[]}}} config config
 * @returns {{check(category: string, test: string, log: string[], config: Object): Error|void, restErrors(): string[]}} checker
 */
module.exports = function createInfrastructureLogErrorsChecker(config) {
	const expectedInfrastructureErrorsMap = new Map();
	const restRegexps = new Set();
	for (const category of Object.keys(config)) {
		for (const testName of Object.keys(config[category])) {
			let byCategory = expectedInfrastructureErrorsMap.get(category);
			if (!byCategory) {
				byCategory = new Map();
				expectedInfrastructureErrorsMap.set(category, byCategory);
			}
			const regexps = config[category][testName];
			if (Array.isArray(regexps)) {
				for (const reg of regexps) restRegexps.add(reg);
				byCategory.set(testName, regexps.slice());
			} else {
				restRegexps.add(regexps);
				byCategory.set(testName, [regexps]);
			}
		}
	}

	function check(category, testName, log, config) {
		let results = checkErrors(log, config);
		if (results.length === 0) return;

		const byCategory = expectedInfrastructureErrorsMap.get(category);
		if (!byCategory) return new Error(results[0]);
		const filters = byCategory.get(testName);
		if (!filters) return new Error(results[0]);

		for (const filter of filters) {
			let n = results.length;
			results = results.filter(r => !filter.test(r));
			if (n !== results.length) restRegexps.delete(filter);
		}

		if (results.length !== 0) return new Error(results[0]);
	}

	function restErrors() {
		if (restRegexps.size === 0) return [];
		// make deterministic result based on remaining regexps
		// not on config key order
		return Array.from(restRegexps)
			.map(r => r.toString())
			.sort()[0];
	}

	return { check, restErrors };
};
