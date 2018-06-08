import { test } from "./module";

it("should run the test", () => {
	expect(test()).toEqual({
		used: "used",
		unused: undefined
	})
});
