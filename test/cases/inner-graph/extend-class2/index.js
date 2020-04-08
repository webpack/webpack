import {
	exportsInfoForA,
	exportsInfoForB,
	exportsInfoForC,
	exportsInfoForD,
	exportsInfoForE,
	exportsInfoForF
} from "./dep2";

it("should load module correctly", () => {
	require("./module");
});

it("A should be used", () => {
	expect(exportsInfoForA).toBe(true);
});

it("B should not be used", () => {
	expect(exportsInfoForB).toBe(false);
});

it("C should be used", () => {
	expect(exportsInfoForC).toBe(true);
});

it("D should not be used", () => {
	expect(exportsInfoForD).toBe(false);
});

it("E should be used", () => {
	expect(exportsInfoForE).toBe(true);
});

it("F should be used", () => {
	// Note: it has side-effects and is not affected by usage of the class
	expect(exportsInfoForF).toBe(true);
});
