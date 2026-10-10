"use strict";

/**
 * @this {import("../../../../").LoaderContext<{}>}
 * @returns {string} a chain whose size is selected by its resource query
 */
module.exports = function loader() {
	const [operator, count] = this.resourceQuery.slice(1).split("-");
	const members = Array.from({ length: Number(count) }, (_, index) => `value.p${index}`);
	const join = operator === "and" ? " && " : " || ";
	return `module.exports = function(value) { return ${members.join(join)}; };
		module.exports.local = function(first, second, third) {
			return ${["first", "second", "third"].join(join)};
		};`;
};
