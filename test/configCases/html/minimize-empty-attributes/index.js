import "./page.html";

it("should drop an empty attribute whose absence means the same", () => {
	// The emitted page is the assertion — see the snapshot in test.config.js.
	expect(true).toBe(true);
});
