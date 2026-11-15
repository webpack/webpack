"use strict";

/**
 * The host types the renderer was told.
 * @type {Set<string>}
 */
const hosts = new Set();

/**
 * @param {string} source the body offered
 * @param {{ type: string, hostType: string, as?: string }} info what it is
 * @returns {string | undefined} the body as written
 */
const recordHost = (source, info) => {
	hosts.add(info.hostType);
	return source;
};

/**
 * @returns {{ asserted: unknown[] }} every host type offered
 */
const hostsSeen = () => {
	const asserted = [[...hosts]];
	hosts.clear();
	return { asserted };
};

module.exports = {
	hosts,
	hostsSeen,
	recordHost
};
