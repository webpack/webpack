"use strict";

const {
	camelCase,
	cssExportConvention,
	dashesCamelCase
} = require("../lib/util/conventions");

describe("conventions", () => {
	describe("camelCase", () => {
		it("should camel-case dashed, dotted and spaced names", () => {
			expect(camelCase("foo-bar-baz")).toBe("fooBarBaz");
			expect(camelCase("foo.bar")).toBe("fooBar");
			expect(camelCase("foo bar")).toBe("fooBar");
		});

		it("should preserve existing camel case", () => {
			expect(camelCase("FooBar")).toBe("fooBar");
		});

		it("should split a run of capitals before a lowercase letter", () => {
			expect(camelCase("FOOBar")).toBe("fooBar");
			expect(camelCase("HTMLParser")).toBe("htmlParser");
		});

		it("should upper-case the letter after a digit run", () => {
			expect(camelCase("foo123bar")).toBe("foo123Bar");
		});

		it("should handle empty and single-character input", () => {
			expect(camelCase("")).toBe("");
			expect(camelCase("A")).toBe("a");
		});
	});

	describe("dashesCamelCase", () => {
		it("should upper-case the letter after each dash run", () => {
			expect(dashesCamelCase("foo-bar")).toBe("fooBar");
			expect(dashesCamelCase("a-b-c")).toBe("aBC");
		});
	});

	describe("cssExportConvention", () => {
		it("should apply the built-in conventions", () => {
			expect(cssExportConvention("foo-bar", "as-is")).toEqual(["foo-bar"]);
			expect(cssExportConvention("foo-bar", "camel-case")).toEqual([
				"foo-bar",
				"fooBar"
			]);
			expect(cssExportConvention("foo-bar", "camel-case-only")).toEqual([
				"fooBar"
			]);
			expect(cssExportConvention("foo-bar", "dashes")).toEqual([
				"foo-bar",
				"fooBar"
			]);
			expect(cssExportConvention("foo-bar", "dashes-only")).toEqual(["fooBar"]);
		});

		it("should accept a function returning a single name or an array", () => {
			expect(cssExportConvention("foo", (name) => `${name}X`)).toEqual([
				"fooX"
			]);
			expect(cssExportConvention("foo", (name) => [name, `${name}Y`])).toEqual([
				"foo",
				"fooY"
			]);
		});

		it("should reject invalid function results", () => {
			expect(() => cssExportConvention("foo", () => "")).toThrow(
				/must return a non-empty string/
			);
			expect(() => cssExportConvention("foo", () => [])).toThrow(
				/returned an empty array/
			);
			expect(() =>
				cssExportConvention("foo", () => /** @type {any} */ ([123]))
			).toThrow(/must return a non-empty string/);
		});

		it("should safely stringify unusual invalid results in the error", () => {
			// a BigInt can't be JSON.stringified, so the message falls back to String()
			expect(() =>
				cssExportConvention("foo", () => /** @type {any} */ (BigInt(1)))
			).toThrow(/got 1/);
			// a circular object whose toString throws exercises the final fallback
			const circular = /** @type {any} */ ({
				toString() {
					throw new Error("no");
				}
			});
			circular.self = circular;
			expect(() => cssExportConvention("foo", () => circular)).toThrow(
				/value cannot be converted to string/
			);
			// JSON.stringify(undefined) is undefined, so String() is used
			expect(() =>
				cssExportConvention("foo", () => /** @type {any} */ (undefined))
			).toThrow(/got undefined/);
		});
	});
});
