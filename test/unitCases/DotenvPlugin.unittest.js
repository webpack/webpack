"use strict";

const DotenvPlugin = require("../../lib/define/DotenvPlugin");

/** @typedef {Record<string, string>} Env */

const PREFIX = "WEBPACK_DOTENV_TEST_";

// The expansion of dotenv-expand v13 as `String#replace` steps, the way
// webpack ran it before the single-pass version. `null` when it takes more
// than `maxSteps` replacements.
/**
 * @param {string} value value to expand
 * @param {Env} processEnv process environment
 * @param {Env} runningParsed values expanded so far
 * @param {number} maxSteps replacements to allow
 * @returns {string | null} expanded value
 */
const referenceExpandValue = (value, processEnv, runningParsed, maxSteps) => {
	const env = { ...runningParsed, ...processEnv };
	const regex = /(?<!\\)\$\{([^{}]+)\}|(?<!\\)\$([a-z_]\w*)/gi;
	let result = value;
	/** @type {RegExpExecArray | null} */
	let match;
	const seen = new Set();
	let steps = 0;
	while ((match = regex.exec(result)) !== null) {
		if (++steps > maxSteps) return null;
		seen.add(result);
		const [template, bracedExpression, unbracedExpression] = match;
		const expression = bracedExpression || unbracedExpression;
		const opMatch = expression.match(/(:\+|\+|:-|-)/);
		const splitter = opMatch ? opMatch[0] : null;
		const r = splitter ? expression.split(splitter) : [expression];
		/** @type {string} */
		let defaultValue;
		/** @type {string | null | undefined} */
		let found;
		const key = /** @type {string} */ (r.shift());
		if ([":+", "+"].includes(splitter || "")) {
			defaultValue = env[key] ? r.join(splitter || "") : "";
			found = null;
		} else {
			defaultValue = r.join(splitter || "");
			found = env[key];
		}
		result = result.replace(
			template,
			found && !seen.has(found) ? found : defaultValue
		);
		if (result === runningParsed[key]) break;
		regex.lastIndex = 0;
	}
	return result;
};

/**
 * @param {Env} parsed values of a dotenv file
 * @param {Env} processEnv process environment
 * @param {number} maxSteps replacements to allow per value
 * @returns {Env | null} expanded values
 */
const referenceExpand = (parsed, processEnv, maxSteps) => {
	/** @type {Env} */
	const runningParsed = {};
	/** @type {Env} */
	const result = {};
	for (const key of Object.keys(parsed)) {
		let value = parsed[key];
		if (
			Object.prototype.hasOwnProperty.call(processEnv, key) &&
			processEnv[key] !== value
		) {
			value = processEnv[key];
		} else {
			const expanded = referenceExpandValue(
				value,
				processEnv,
				runningParsed,
				maxSteps
			);
			if (expanded === null) return null;
			value = expanded;
		}
		value = value.replace(/\\\$/g, "$");
		result[key] = value;
		runningParsed[key] = value;
	}
	return result;
};

/**
 * @param {Env} parsed values of a dotenv file
 * @returns {Env} the values webpack defines for them
 */
const expandWithPlugin = (parsed) => {
	const plugin = /** @type {EXPECTED_ANY} */ (new DotenvPlugin());
	/** @type {Env} */
	const env = plugin._getEnv([PREFIX], { ...parsed });
	/** @type {Env} */
	const result = {};
	for (const key of Object.keys(parsed)) result[key] = env[key];
	return result;
};

/**
 * @param {Env} parsed values of a dotenv file
 * @returns {Env} the values dotenv-expand gives for them
 */
const expectSameAsReference = (parsed) => {
	const processEnv = /** @type {Env} */ ({ ...process.env });
	const expected = referenceExpand(parsed, processEnv, 10000);
	if (expected === null) throw new Error("the reference does not finish");
	expect(expandWithPlugin(parsed)).toEqual(expected);
	return expected;
};

/**
 * @param {Record<string, string>} values values keyed by short names
 * @returns {Env} the values keyed by prefixed names
 */
const withPrefix = (values) => {
	/** @type {Env} */
	const result = {};
	for (const key of Object.keys(values)) {
		result[PREFIX + key] = values[key].replace(/@/g, PREFIX);
	}
	return result;
};

describe("DotenvPlugin expansion", () => {
	const ownKey = `${PREFIX}FROM_PROCESS`;

	beforeEach(() => {
		process.env[ownKey] = "process-value";
	});

	afterEach(() => {
		delete process.env[ownKey];
	});

	it.each([
		["plain references", { A: "a", B: "$@A-${@A}" }],
		["defaults", { A: "", B: "${@A:-fallback}", C: "${@MISSING-x}" }],
		["alternates", { A: "a", B: "${@A:+alt}", C: "${@MISSING:+alt}" }],
		["escaped references", { A: "a", B: "\\$@A $@A \\${@A}" }],
		["escaped reference before a match", { A: "\\$@B", B: "b", C: "$@A" }],
		["an escaped template matched again", { A: "x\\$@B$@B", B: "b" }],
		["self references", { A: "$@A", B: "pre$@B", C: "${@C:-d}" }],
		["a value that expands to itself", { A: "v", B: "$@A", C: "$@B" }],
		["a value equal to an earlier text", { A: "\\$@A", B: "$@A" }],
		["a `$$` pattern", { A: "$$-$$", B: "x$@A" }],
		["the text before the match", { A: "$`", B: "lead $@A tail" }],
		["the text after the match", { A: "$'", B: "lead $@A tail" }],
		["a `${` left open", { A: "${", B: "x$@A@A}" }],
		["a `$` before an inserted brace", { A: "{@B}", B: "b", C: "$$@A" }],
		["nested braces", { A: "a", B: "${${@A}}", C: "${@A:-${@A}}" }],
		["a value from process.env", { FROM_PROCESS: "file", B: "$@FROM_PROCESS" }],
		["process.env set to the same value", { FROM_PROCESS: "process-value" }],
		["an empty value", { A: "", B: "[$@A]" }],
		["lone dollars", { A: "$", B: "a$", C: "$1 $-" }]
	])("expands %s like dotenv-expand", (_name, values) => {
		expectSameAsReference(withPrefix(values));
	});

	it.each([
		["escaped references", { B: "\\$@C", C: "\\$@B", CYCLE: "x$@B" }],
		["a `$&` pattern", { A: "$&", B: "$@A" }],
		["a default that holds its own template", { A: "${@MISSING:-$&}" }]
	])("stops a cycle of %s before the step budget", (_name, values) => {
		const parsed = withPrefix(values);
		const processEnv = /** @type {Env} */ ({ ...process.env });
		expect(referenceExpand(parsed, processEnv, 10000)).toBeNull();
		// the step budget throws "takes more than … steps" instead
		expect(() => expandWithPlugin(parsed)).toThrow(
			/never finishes: it repeats/
		);
	});

	it("expands generated values like dotenv-expand", () => {
		// a fixed seed keeps the corpus the same on every run
		let seed = 1;
		const random = () => {
			seed = (seed * 1103515245 + 12345) % 2147483648;
			return seed / 2147483648;
		};
		const names = ["A", "B", "C", "D"];
		const pieces = [
			"$",
			"$",
			"{",
			"}",
			"\\",
			":-",
			":+",
			"-",
			"+",
			"x",
			"`",
			"'",
			"&",
			"@A",
			"@B",
			"@C",
			"@D",
			"$@A",
			"${@B}",
			"${@C:-$@A}"
		];
		let compared = 0;
		for (let sample = 0; sample < 3000; sample++) {
			/** @type {Record<string, string>} */
			const values = {};
			for (const name of names) {
				let value = "";
				const length = Math.floor(random() * 8);
				for (let i = 0; i < length; i++) {
					value += pieces[Math.floor(random() * pieces.length)];
				}
				values[name] = value;
			}
			const parsed = withPrefix(values);
			const processEnv = /** @type {Env} */ ({ ...process.env });
			// the reference loops forever on some inputs, those are left out
			const expected = referenceExpand(parsed, processEnv, 200);
			if (expected === null) continue;
			expect(expandWithPlugin(parsed)).toEqual(expected);
			compared++;
		}
		expect(compared).toBeGreaterThan(2500);
	});
});
