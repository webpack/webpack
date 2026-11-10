const key = "b";
const table = { a: 1, [key]: 2, ...{ c: 3 }, key };

function make() {
	return { value: { deep: 4 } };
}

const iife = (function (n) {
	return n + 1;
})(1);
const bound = function (n) {
	return this.base + n;
}.call({ base: 10 }, 5);
const arrow = ((n) => n * 3)(2);

// a dead branch only when the build evaluates `void 0` to undefined
if (typeof void 0 !== "undefined") require("./missing");

exports.read = () => ({
	member: table[`a`] + table["b"],
	callRooted: make().value.deep,
	computed: table[key],
	shorthand: table.key,
	nested: [iife, bound, arrow],
	meta: typeof import.meta,
	voided: typeof void key
});
