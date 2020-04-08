import {
	exportsInfoForA,
	exportsInfoForB,
	exportsInfoForY,
	exportsInfoForMixin1,
	exportsInfoForMixin2
} from "./dep2";

it("should load modules correctly", () => {
	require("./module1");
	require("./module2");
});

it("B should not be used", () => {
	expect(exportsInfoForB).toBe(false);
});

it("A should be used", () => {
	expect(exportsInfoForA).toBe(true);
});

it("Pure mixin should be unused, another used", () => {
	expect(exportsInfoForMixin1).toBe(false);
	expect(exportsInfoForMixin2).toBe(true);
	expect(exportsInfoForY).toBe(true);
});
