import attributesWithType from "./data.data.js" with { type: "custom", preload: "true" };
import attributesEmpty from "./data2.data.js";

it("should expose import attributes to loaders via _importAttributes", function() {
	expect(attributesWithType).toEqual({ type: "custom", preload: "true" });
});

it("should return undefined when no import attributes are present", function() {
	expect(attributesEmpty).toBeUndefined();
});
