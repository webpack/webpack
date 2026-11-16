"use strict";

const mergeImportConditions = require("../../lib/css/mergeImportConditions");

describe("mergeImportConditions", () => {
	it("should keep the conditions of an import without importers", () => {
		expect(mergeImportConditions("a", "display: grid", "print")).toEqual({
			layer: "a",
			supports: "display: grid",
			media: "print"
		});
		expect(mergeImportConditions(undefined, undefined, undefined, [])).toEqual({
			layer: undefined,
			supports: undefined,
			media: undefined
		});
	});

	it("should nest layers and join supports conditions", () => {
		expect(
			mergeImportConditions("inner", "display: flex", undefined, [
				["outer", "display: grid", undefined]
			])
		).toEqual({
			layer: "outer.inner",
			supports: "(display: grid) and (display: flex)",
			media: undefined
		});
	});

	it("should keep an anonymous layer when it is the only one", () => {
		expect(
			mergeImportConditions(undefined, undefined, undefined, [
				["", undefined, undefined]
			])
		).toEqual({ layer: "", supports: undefined, media: undefined });
	});

	it("should match where both media query lists match", () => {
		/**
		 * @param {string} outer the outer media query list
		 * @param {string} inner the inner media query list
		 * @returns {string | undefined} the merged list
		 */
		const merge = (outer, inner) =>
			mergeImportConditions(undefined, undefined, inner, [
				[undefined, undefined, outer]
			]).media;
		expect(merge("(min-width: 1px)", "(max-width: 9px)")).toBe(
			"(min-width: 1px) and (max-width: 9px)"
		);
		expect(merge("screen", "(max-width: 9px)")).toBe(
			"screen and (max-width: 9px)"
		);
		expect(merge("(min-width: 1px)", "print")).toBe(
			"print and (min-width: 1px)"
		);
		expect(merge("screen", "print")).toBe("not all");
		expect(merge("all", "only print and (color)")).toBe(
			"only print and (color)"
		);
		expect(merge("screen and (color)", "screen and (grid)")).toBe(
			"screen and (color) and (grid)"
		);
		expect(merge("not screen", "(color)")).toBe("print and (color)");
		expect(merge("not all", "screen")).toBe("not all");
		expect(
			mergeImportConditions(undefined, undefined, "screen", [
				[undefined, undefined, "print"],
				[undefined, undefined, "screen"]
			]).media
		).toBe("not all");
		expect(merge("screen, print", "print")).toBe("print");
		expect(merge("not screen and (color)", "print")).toBe(
			"print, print and (not ((color)))"
		);
		expect(merge("not (color)", "(hover)")).toBe("(not (color)) and (hover)");
		expect(merge("(color) or (hover)", "(width > 1px)")).toBe(
			"((color) or (hover)) and (width > 1px)"
		);
		expect(merge("screen", "(a) or (b)")).toBe("screen and ((a) or (b))");
		expect(merge("screen and (a)", "screen and (b) or (c)")).toBe(
			"screen and (a) and ((b) or (c))"
		);
		expect(merge("screen, print", "(color)")).toBe(
			"screen and (color), print and (color)"
		);
		expect(merge("(a), (b)", "(c)")).toBe("(a) and (c), (b) and (c)");
		expect(merge("(width: calc(1px, 2px))", "(c)")).toBe(
			"(width: calc(1px, 2px)) and (c)"
		);
	});
});
