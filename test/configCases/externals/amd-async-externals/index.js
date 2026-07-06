import propValue from "amd-prop-external";
import value from "amd-external";

it("should load amd-async externals through the AMD loader", () => {
	expect(value).toBe(42);
});

it("should support property access on amd-async externals", () => {
	expect(propValue).toBe("subvalue");
});

it("should reject failing amd-async externals", () => {
	return expect(() => import("failing-amd-external")).rejects.toEqual(
		expect.objectContaining({
			message: "amd reject"
		})
	);
});
