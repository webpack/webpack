import { value } from "./mid.js";

it("should fall back to the type check for a module that cannot answer", () => {
	// the css module's `canBeWrappedInConcatenation` is blanked below, as a
	// module built against an older webpack would have it: wrapping it anyway
	// would strand its shared-scope bindings inside the accessor
	expect(typeof value).toBe("string");
	expect(value.length).toBeGreaterThan(0);
});
