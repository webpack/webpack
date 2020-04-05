import {exportsInfoForA, exportsInfoForB} from "./dep2";

it("should load module correctly", () => {
	require("./module");
});

it("B should not be used", () => {
	expect(exportsInfoForB).toBe(false);
});

it("A should be used", () => {
	expect(exportsInfoForA).toBe(true);
});
