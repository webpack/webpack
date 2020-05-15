import value from "promise-external";
import request from "import-external";

it("should allow async externals", () => {
	expect(value).toBe(42);
	expect(request).toBe("/hello/world.js");
});

it("should allow to catch errors of async externals", () => {
	return expect(() => import("failing-promise-external")).rejects.toEqual(
		expect.objectContaining({
			message: "external reject"
		})
	);
});
