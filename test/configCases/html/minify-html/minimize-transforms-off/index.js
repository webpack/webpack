import "./page.html";

it("should make none of the rewrites the options turned off", () => {
	// The emitted page is snapshotted in test.config.js (afterExecute).
	expect(true).toBe(true);
});
