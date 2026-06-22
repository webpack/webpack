"use strict";

it("does not support the `this` external in a universal ESM target", () => {
	// `this` external: top-level `this` is undefined in an ESM module. Engine
	// wording differs (V8 "Cannot read property/properties of undefined" vs JSC
	// "undefined is not an object").
	expect(() => require("thisExt")).toThrow(
		/Cannot read propert(?:y|ies)|undefined is not an object/
	);
});
