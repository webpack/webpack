"use strict";

const RequestShortener = require("../lib/RequestShortener");
const RuntimeTemplate = require("../lib/RuntimeTemplate");

/** @typedef {import("../lib/config/defaults").OutputNormalizedWithDefaults} OutputOptions */

describe("RuntimeTemplate.concatenation", () => {
	it("no args", () => {
		const runtimeTemplate = new RuntimeTemplate(
			/** @type {import("../lib/Compilation")} */ (
				/** @type {unknown} */ (undefined)
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({ environment: { templateLiteral: false } })
			),
			new RequestShortener(__dirname)
		);
		expect(runtimeTemplate.concatenation()).toBe('""');
	});

	it("1 arg", () => {
		const runtimeTemplate = new RuntimeTemplate(
			/** @type {import("../lib/Compilation")} */ (
				/** @type {unknown} */ (undefined)
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({ environment: { templateLiteral: false } })
			),
			new RequestShortener(__dirname)
		);
		expect(
			runtimeTemplate.concatenation({
				expr: /** @type {string} */ (/** @type {unknown} */ (1))
			})
		).toBe('"" + 1');
		expect(runtimeTemplate.concatenation("str")).toBe('"str"');
	});

	it("es5", () => {
		const runtimeTemplate = new RuntimeTemplate(
			/** @type {import("../lib/Compilation")} */ (
				/** @type {unknown} */ (undefined)
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({ environment: { templateLiteral: false } })
			),
			new RequestShortener(__dirname)
		);

		expect(
			runtimeTemplate.concatenation({ expr: "__webpack__.p" }, "str/a")
		).toBe('__webpack__.p + "str/a"');
		expect(
			runtimeTemplate.concatenation(
				{ expr: "__webpack__.p" },
				{ expr: "str.a" },
				"str"
			)
		).toBe('"" + __webpack__.p + str.a + "str"');
		expect(
			runtimeTemplate.concatenation("a", "b", {
				expr: /** @type {string} */ (/** @type {unknown} */ (1))
			})
		).toBe('"a" + "b" + 1');
		expect(
			runtimeTemplate.concatenation(
				"a",
				{ expr: /** @type {string} */ (/** @type {unknown} */ (1)) },
				"b"
			)
		).toBe('"a" + 1 + "b"');
	});

	describe("es6", () => {
		const runtimeTemplate = new RuntimeTemplate(
			/** @type {import("../lib/Compilation")} */ (
				/** @type {unknown} */ (undefined)
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({ environment: { templateLiteral: true } })
			),
			new RequestShortener(__dirname)
		);

		it("should prefer shorten variant #1", () => {
			expect(
				runtimeTemplate.concatenation(
					{ expr: /** @type {string} */ (/** @type {unknown} */ (1)) },
					"a",
					{ expr: /** @type {string} */ (/** @type {unknown} */ (2)) }
				)
			).toBe('1 + "a" + 2');
		});

		it("should prefer shorten variant #2", () => {
			expect(
				runtimeTemplate.concatenation(
					{ expr: /** @type {string} */ (/** @type {unknown} */ (1)) },
					"a",
					{ expr: /** @type {string} */ (/** @type {unknown} */ (2)) },
					"b"
				)
			).toBe('1 + "a" + 2 + "b"');
		});

		it("should prefer shorten variant #3", () => {
			/* eslint-disable no-template-curly-in-string */
			expect(
				runtimeTemplate.concatenation(
					"a",
					{ expr: /** @type {string} */ (/** @type {unknown} */ (1)) },
					"b"
				)
			).toBe("`a${1}b`");
			/* eslint-enable */
		});
	});
});

describe("RuntimeTemplate.optionalChaining", () => {
	/**
	 * @param {boolean} optionalChaining whether the environment supports optional chaining
	 * @returns {RuntimeTemplate} runtime template
	 */
	const create = (optionalChaining) =>
		new RuntimeTemplate(
			/** @type {import("../lib/Compilation")} */ (
				/** @type {unknown} */ (undefined)
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({ environment: { optionalChaining } })
			),
			new RequestShortener(__dirname)
		);

	it("uses optional chaining when supported", () => {
		const runtimeTemplate = create(true);
		expect(runtimeTemplate.optionalChaining("obj", "prop")).toBe("obj?.prop");
		expect(runtimeTemplate.optionalChaining("fn", "()")).toBe("fn?.()");
		expect(runtimeTemplate.optionalChaining("obj", "method(arg)")).toBe(
			"obj?.method(arg)"
		);
		expect(runtimeTemplate.optionalChaining("obj", "[key]")).toBe("obj?.[key]");
	});

	it("falls back to && when not supported", () => {
		const runtimeTemplate = create(false);
		expect(runtimeTemplate.optionalChaining("obj", "prop")).toBe(
			"obj && obj.prop"
		);
		expect(runtimeTemplate.optionalChaining("fn", "()")).toBe("fn && fn()");
		expect(runtimeTemplate.optionalChaining("obj", "method(arg)")).toBe(
			"obj && obj.method(arg)"
		);
		expect(runtimeTemplate.optionalChaining("obj", "[key]")).toBe(
			"obj && obj[key]"
		);
	});
});

describe("RuntimeTemplate.method", () => {
	/**
	 * @param {boolean} methodShorthand whether the environment supports method shorthand
	 * @param {boolean} arrowFunction whether the environment supports arrow functions
	 * @returns {RuntimeTemplate} runtime template
	 */
	const create = (methodShorthand, arrowFunction) =>
		new RuntimeTemplate(
			/** @type {import("../lib/Compilation")} */ (
				/** @type {unknown} */ (undefined)
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({
					environment: { methodShorthand, arrowFunction }
				})
			),
			new RequestShortener(__dirname)
		);

	it("uses method shorthand when supported", () => {
		const runtimeTemplate = create(true, true);
		expect(runtimeTemplate.method("get", "name", "return name;")).toBe(
			"get(name) {\n\treturn name;\n}"
		);
	});

	it("falls back to an arrow property when shorthand is unsupported", () => {
		const runtimeTemplate = create(false, true);
		expect(runtimeTemplate.method("get", "name", "return name;")).toBe(
			"get: (name) => {\n\treturn name;\n}"
		);
	});

	it("falls back to a function property without arrow support", () => {
		const runtimeTemplate = create(false, false);
		expect(runtimeTemplate.method("get", "name", "return name;")).toBe(
			"get: function(name) {\n\treturn name;\n}"
		);
	});
});
