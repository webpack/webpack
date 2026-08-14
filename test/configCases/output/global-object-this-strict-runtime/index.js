import { value } from "./dependency.js";

it("should run the runtime when output.globalObject is 'this'", () => {
	expect(value).toBe(42);
	// the jsonp runtime registered itself on the object `this` resolved to
	expect(Array.isArray(self.webpackChunkGlobalObjectThisStrictRuntime)).toBe(
		true
	);
});
