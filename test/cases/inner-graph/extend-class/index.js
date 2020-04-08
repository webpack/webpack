import {
	exportsInfoForA,
	exportsInfoForB,
	exportsInfoForC,
	exportsInfoForY,
	exportsInfoForMixin1,
	exportsInfoForMixin2,
	exportsInfoForMixin3
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

it("Pure super expression should be unused, another used", () => {
	expect(exportsInfoForMixin1).toBe(false);

	expect(exportsInfoForMixin2).toBe(true);
	expect(exportsInfoForMixin3).toBe(true);
	expect(exportsInfoForC).toBe(true);
	expect(exportsInfoForY).toBe(true);
});
