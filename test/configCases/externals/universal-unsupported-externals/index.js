"use strict";

it("does not support the `this` external in a universal ESM target", () => {
	// `this` external: top-level `this` is undefined in an ESM module
	// (V8 wording differs across node versions: "property" vs "properties")
	expect(() => require("thisExt")).toThrow(/Cannot read propert(?:y|ies)/);
});
