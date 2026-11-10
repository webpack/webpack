import importedValue from "./value";

const cases = [
	["and", 32, require("./chain?and-32")],
	["and", 64, require("./chain?and-64")],
	["and", 128, require("./chain?and-128")],
	["or", 32, require("./chain?or-32")],
	["or", 64, require("./chain?or-64")],
	["or", 128, require("./chain?or-128")]
];

for (const [operator, count, run] of cases) {
	it(`preserves values and short circuiting for ${count} ${operator} operands`, () => {
		const value = {};
		const reads = [];
		let stop = -1;
		for (let index = 0; index < count; index++) {
			Object.defineProperty(value, `p${index}`, {
				get() {
					reads.push(index);
					if (operator === "and") return index === stop ? 0 : index + 1;
					return index === stop ? "found" : "";
				}
			});
		}
		expect(run(value)).toBe(operator === "and" ? count : "");
		expect(reads).toEqual(Array.from({ length: count }, (_, index) => index));
		reads.length = 0;
		stop = 1;
		expect(run(value)).toBe(operator === "and" ? 0 : "found");
		expect(reads).toEqual([0, 1]);
		expect(run.local(1, 2, 3)).toBe(operator === "and" ? 3 : 1);
		expect(run.local(0, 2, 3)).toBe(operator === "and" ? 0 : 2);
		expect(run.local(0, 0, "")).toBe(operator === "and" ? 0 : "");
	});
}

it("preserves chains containing constants, calls and mixed operators", () => {
	const calls = [];
	/**
	 * @param {number} value input
	 * @returns {number} the input
	 */
	const read = (value) => {
		calls.push(value);
		return value;
	};
	/**
	 * @param {{first: number, second: number, third: number}} value input
	 * @returns {number} the result
	 */
	const run = (value) => (value.first || value.second) && value.third;
	expect(run({ first: 0, second: 2, third: 3 })).toBe(3);
	expect(run({ first: 0, second: 0, third: 3 })).toBe(0);
	/**
	 * @param {number} first first input
	 * @param {number} second second input
	 * @returns {boolean} false
	 */
	const constant = (first, second) => false && first && second;
	expect(constant(1, 2)).toBe(false);
	/**
	 * @param {number} value input
	 * @returns {number} the result
	 */
	const effect = (value) => read(value) && read(2) && read(3);
	expect(effect(0)).toBe(0);
	expect(calls).toEqual([0]);
	calls.length = 0;
	expect(effect(1)).toBe(3);
	expect(calls).toEqual([1, 2, 3]);
});

it("preserves computed properties and their side effects", () => {
	const reads = [];
	/** @returns {string} the property name */
	const key = () => {
		reads.push("key");
		return "second";
	};
	/**
	 * @param {Record<string, number>} value input
	 * @returns {number} the result
	 */
	const run = (value) => value.first && value[key()] && value.third;
	expect(run({ first: 0 })).toBe(0);
	expect(reads).toEqual([]);
	expect(run({ first: 1, second: 2, third: 3 })).toBe(3);
	expect(reads).toEqual(["key"]);
	/**
	 * @param {{first: number, second: number, third: number}} value input
	 * @returns {number} the result
	 */
	const staticKeys = (value) => value["first"] && value[`second`] && value.third;
	expect(staticKeys({ first: 1, second: 2, third: 3 })).toBe(3);
	expect(staticKeys({ first: 1, second: 0, third: 3 })).toBe(0);
});

it("preserves dependency discovery and undefined operands", () => {
	/**
	 * @param {number} first first input
	 * @param {number} second second input
	 * @returns {number} the result
	 */
	const run = (first, second) => first && second && require("./value");
	expect(run(1, 2)).toBe(42);
	expect(run(0, 2)).toBe(0);
	/**
	 * @param {number} first first input
	 * @param {number} second second input
	 * @returns {number} the result
	 */
	const imported = (first, second) => importedValue && first && second;
	expect(imported(1, 2)).toBe(2);
	expect(imported(0, 2)).toBe(0);
	/**
	 * @param {number} first first input
	 * @param {number} second second input
	 * @returns {undefined} undefined
	 */
	const missing = (first, second) => undefined && first && second;
	expect(missing(1, 2)).toBeUndefined();
});

it("honors custom evaluation results for local chains", () => {
	/**
	 * @param {boolean} pluginValue input
	 * @returns {boolean} the result
	 */
	const identifier = (pluginValue) => pluginValue && pluginValue && pluginValue;
	/**
	 * @param {{pluginValue: boolean}} value input
	 * @returns {boolean} the result
	 */
	const member = (value) =>
		value.pluginValue && value.pluginValue && value.pluginValue;
	/**
	 * @param {boolean} pluginLogicalValue input
	 * @returns {boolean} the result
	 */
	const logical = (pluginLogicalValue) =>
		pluginLogicalValue && pluginLogicalValue && pluginLogicalValue;
	expect(identifier(true)).toBe(EVALUATION_PLUGIN !== "Identifier");
	expect(member({ pluginValue: true })).toBe(
		EVALUATION_PLUGIN !== "MemberExpression"
	);
	expect(logical(true)).toBe(EVALUATION_PLUGIN !== "LogicalExpression");
});
