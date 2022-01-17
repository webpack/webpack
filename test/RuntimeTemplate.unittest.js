"use strict";

const RuntimeTemplate = require("../lib/RuntimeTemplate");
const RequestShortener = require("../lib/RequestShortener");

describe("RuntimeTemplate.concatenation", () => {
	it("no args", () => {
		const runtimeTemplate = new RuntimeTemplate(
			undefined,
			{ environment: { templateLiteral: false } },
			new RequestShortener(__dirname)
		);
		expect(runtimeTemplate.concatenation()).toBe('""');
	});

	it("1 arg", () => {
		const runtimeTemplate = new RuntimeTemplate(
			undefined,
			{ environment: { templateLiteral: false } },
			new RequestShortener(__dirname)
		);
		expect(runtimeTemplate.concatenation({ expr: 1 })).toBe('"" + 1');
		expect(runtimeTemplate.concatenation("str")).toBe('"str"');
	});

	it("es5", () => {
		const runtimeTemplate = new RuntimeTemplate(
			undefined,
			{ environment: { templateLiteral: false } },
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
		expect(runtimeTemplate.concatenation("a", "b", { expr: 1 })).toBe(
			'"a" + "b" + 1'
		);
		expect(runtimeTemplate.concatenation("a", { expr: 1 }, "b")).toBe(
			'"a" + 1 + "b"'
		);
	});

	describe("es6", () => {
		const runtimeTemplate = new RuntimeTemplate(
			undefined,
			{ environment: { templateLiteral: true } },
			new RequestShortener(__dirname)
		);

		it("should prefer shorten variant #1", () => {
			expect(runtimeTemplate.concatenation({ expr: 1 }, "a", { expr: 2 })).toBe(
				'1 + "a" + 2'
			);
		});

		it("should prefer shorten variant #2", () => {
			expect(
				runtimeTemplate.concatenation({ expr: 1 }, "a", { expr: 2 }, "b")
			).toBe('1 + "a" + 2 + "b"');
		});

		it("should prefer shorten variant #3", () => {
			/* eslint-disable no-template-curly-in-string */
			expect(runtimeTemplate.concatenation("a", { expr: 1 }, "b")).toBe(
				"`a${1}b`"
			);
			/* eslint-enable */
		});
	});
});
