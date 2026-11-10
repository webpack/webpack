/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/**
 * @template T
 * @typedef {import("./SourceProcessor").VisitorFn<T>} VisitorFn
 */
/**
 * @template T
 * @typedef {import("./SourceProcessor").CompiledVisitorBucket<T>} CompiledVisitorBucket
 */

/**
 * Empty every bucket of a compiled visitor map in place, so a dispatch loop
 * running over one ends after the visitor that asked and none fires again.
 * @template TPath
 * @param {CompiledVisitorBucket<TPath>[]} map the map a walk dispatches from
 * @returns {VisitorFn<TPath>[][]} each emptied list followed by its visitors, for {@link resumeVisitors}
 */
const haltVisitors = (map) => {
	/** @type {VisitorFn<TPath>[][]} */
	const halted = [];
	for (let type = 0; type < map.length; type++) {
		const bucket = map[type];
		if (bucket === undefined) continue;
		halted.push(bucket.enter, [...bucket.enter], bucket.exit, [...bucket.exit]);
		bucket.enter.length = 0;
		bucket.exit.length = 0;
	}
	return halted;
};

/**
 * Put back what {@link haltVisitors} emptied, so the next walk fires them all.
 * @template TPath
 * @param {VisitorFn<TPath>[][]} halted what `haltVisitors` returned
 */
const resumeVisitors = (halted) => {
	for (let i = 0; i < halted.length; i += 2) {
		const list = halted[i];
		const visitors = halted[i + 1];
		for (let k = 0; k < visitors.length; k++) list.push(visitors[k]);
	}
};

module.exports.haltVisitors = haltVisitors;
module.exports.resumeVisitors = resumeVisitors;
