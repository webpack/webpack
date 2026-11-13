import "./page.html";

it("should write a boolean attribute bare whatever its value said", () => {
	// The emitted page is snapshotted in test.config.js (afterExecute).
	expect(true).toBe(true);
});
