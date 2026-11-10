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

exports.read = () => ({
	member: table[`a`] + table["b"],
	callRooted: make().value.deep,
	computed: table[key],
	shorthand: table.key,
	nested: [iife, bound, arrow],
	meta: typeof import.meta
});
