"use strict";

const vm = require("vm");
const { javascript } = require("webpack");
const { fixture } = require("../../helpers/fixture");

// By case, its name, its program in `test/fixtures/javascript/<dir>/` and
// what that program prints.
const cases = [
	{ name: "direct assignment", dir: "global-builtins-direct-assignment", expected: "99" },
	{ name: "globalThis assignment", dir: "global-builtins-globalthis-assignment", expected: "99" },
	{ name: "computed global owner", dir: "global-builtins-computed-global-owner", expected: "99" },
	{ name: "computed method", dir: "global-builtins-computed-method", expected: "99" },
	{ name: "computed Object writer", dir: "global-builtins-computed-object-writer", expected: "99" },
	{ name: "direct Object writer", dir: "global-builtins-direct-object-writer", expected: "99" },
	{ name: "direct Reflect writer", dir: "global-builtins-direct-reflect-writer", expected: "99" },
	{ name: "computed Reflect writer", dir: "global-builtins-computed-reflect-writer", expected: "99" },
	{ name: "shadowed globalThis", dir: "global-builtins-shadowed-globalthis", expected: "1 99" },
	{ name: "shadowed Math", dir: "global-builtins-shadowed-math", expected: "99\n1" },
	{ name: "unmodified built-in", dir: "global-builtins-unmodified-built-in", expected: "1" },
	{ name: "unrelated method mutation", dir: "global-builtins-unrelated-method-mutation", expected: "1" },
	{ name: "unrelated built-in mutation", dir: "global-builtins-unrelated-built-in-mutation", expected: "99 A" },
	{ name: "window assignment", dir: "global-builtins-window-assignment", expected: "99" },
	{ name: "self assignment", dir: "global-builtins-self-assignment", expected: "99" },
	{ name: "global assignment", dir: "global-builtins-global-assignment", expected: "99" },
	{ name: "computed prototype owner", dir: "global-builtins-computed-prototype-owner", expected: "patched" },
	{ name: "getter installed through Object", dir: "global-builtins-getter-installed-through-object", expected: "get\n99" },
	{ name: "computed key effects", dir: "global-builtins-computed-key-effects", expected: "key\n99" },
	{ name: "destructuring target", dir: "global-builtins-destructuring-target", expected: "99" },
	{ name: "numeric unrelated owner", dir: "global-builtins-numeric-unrelated-owner", expected: "1" },
	{ name: "computed unrelated owner with effects", dir: "global-builtins-computed-unrelated-owner-with-effects", expected: "key\n1" }
];
// The programs writing through an optional global owner.
const optional = [
	"global-builtins-optional-owner-1",
	"global-builtins-optional-owner-2"
];

/**
 * @param {string} source a program
 * @returns {string} what the program prints in its own realm
 */
const runProgram = (source) => {
	/** @type {string[]} */
	const lines = [];
	const context = vm.createContext({
		console: {
			log: (/** @type {unknown[]} */ ...values) =>
				lines.push(values.map(String).join(" "))
		}
	});
	// Model the global-object names of the supported hosts, including Node 10.
	vm.runInContext("this.globalThis = this.window = this.self = this.global = this;", context);
	vm.runInContext(source, context);
	return lines.join("\n");
};

describe("minifying built-in mutations through the global object", () => {
	for (const ecma of [5, 2020]) {
		for (const mangle of [false, true]) {
			it.each(cases)("$name (ecma " + ecma + ", mangle " + mangle + ")", ({ dir, expected }) => {
				const source = fixture("javascript", dir);
				expect(runProgram(source)).toBe(expected);
				const { code } = /** @type {{ code: string }} */ (
					new javascript.syntax.SourceProcessor().process(source, {
						mode: "minify",
						ecma,
						compress: {},
						mangle
					})
				);
				expect(runProgram(code)).toBe(expected);
				expect(code).toMatchSnapshot();
			});
		}
	}

	it.each(optional)("should preserve an optional global owner: %s", (dir) => {
		const source = fixture("javascript", dir);
		const { code } = /** @type {{ code: string }} */ (
			new javascript.syntax.SourceProcessor().process(source, {
				mode: "minify",
				compress: {},
				mangle: false
			})
		);
		expect(code).toMatchSnapshot();
		expect(code).toContain("Math.abs(");
	});
});
