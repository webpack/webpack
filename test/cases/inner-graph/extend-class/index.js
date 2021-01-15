import {
	exportsInfoForA,
	exportsInfoForB,
	exportsInfoForC,
	exportsInfoForY,
	exportsInfoForZ,
	exportsInfoForMixin1,
	exportsInfoForMixin2,
	exportsInfoForMixin3
} from "./dep2";

it("should load modules correctly", () => {
	require("./module1");
	require("./module2");
});

if (process.env.NODE_ENV === "production") {
	it("B should not be used", () => {
		expect(exportsInfoForB).toBe(false);
	});
}

it("A should be used", () => {
	expect(exportsInfoForA).toBe(true);
});

it("Z used, inner graph can not determine const usage", () => {
	expect(exportsInfoForZ).toBe(true);
});

it("Pure super expression should be unused, another used", () => {
	if (process.env.NODE_ENV === "production") {
		expect(exportsInfoForMixin1).toBe(false);
	}

	expect(exportsInfoForMixin2).toBe(true);
	expect(exportsInfoForMixin3).toBe(true);
	expect(exportsInfoForC).toBe(true);
	expect(exportsInfoForY).toBe(true);
});
