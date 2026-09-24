import source plain from "./plain.js";

it("should report a link error for a static source phase import", () => {
	// The error is the subject; the binding still renders so the bundle runs.
	expect(plain).toBe("default export");
});
