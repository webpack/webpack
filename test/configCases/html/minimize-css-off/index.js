import "./page.html";

it("should leave inline css alone when minimize.css is false", () => {
	// The emitted page is snapshotted in test.config.js (afterExecute).
	expect(true).toBe(true);
});
