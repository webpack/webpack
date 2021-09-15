import value, { getValue } from "./module";

it("should accept a shared dependency", async () => {
	expect(value).toBe("module");
	await expect(getValue()).resolves.toHaveProperty("default", "module");
	module.hot.accept("./module");

	await new Promise((resolve, reject) =>
		NEXT(require("../../update")(reject, true, resolve))
	);

	expect(value).toBe("common-lib");
	await expect(getValue()).resolves.toHaveProperty("default", "common-lib");
});
