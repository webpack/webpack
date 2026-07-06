import value from "amd-external";

it("should load amd-async externals through the amdContainer AMD loader", () => {
	expect(value).toBe("from-container:amd-module");
});
