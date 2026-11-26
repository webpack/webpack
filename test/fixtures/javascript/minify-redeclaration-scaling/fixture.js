"use strict";

module.exports = {
	/**
	 * @param {number=} size how many variables the callback sets
	 * @returns {string} a function with many declarations and captured writes
	 */
	source(size) {
		const count = size === undefined ? 4 : size;
		/** @type {string[]} */
		const names = [];
		/** @type {string[]} */
		const writes = [];
		for (let i = 0; i < count; i++) {
			names.push(`value${i}`);
			writes.push(`value${i} = value + ${i};`);
		}
		return `(function (update) {
			var ${names.join(",")};
			update(function (value) { ${writes.join("\n")} });
			console.log(${names.join(",")});
		})(function (set) { set(1); });`;
	},
	/**
	 * @param {number=} size how many uninitialized variables to declare
	 * @returns {string} a function with unused declarations
	 */
	uninitialized(size) {
		const count = size === undefined ? 4 : size;
		/** @type {string[]} */
		const names = [];
		for (let i = 0; i < count; i++) names.push(`value${i}`);
		return `function run() {
			var ${names.join(",")};
			if (false) value0.x;
			console.log({}.toString());
		} run();`;
	}
};
