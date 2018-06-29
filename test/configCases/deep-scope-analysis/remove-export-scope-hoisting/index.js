import { test, unused } from "./module";

it("should run the test", () => {
	expect(test()).toEqual({
		used: "used",
		unused: undefined
	});
	expect(unused).toEqual(undefined);
});
