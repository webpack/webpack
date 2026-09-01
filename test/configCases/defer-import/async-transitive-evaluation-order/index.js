it("should evaluate a deferred import's async dependencies where the import sits", async () => {
	const order = (global.__configCases__deferImport__order = []);

	// The async dependency starts before the sibling below the deferred import,
	// and the deferred module's own body waits until the namespace is forced.
	const { force } = await require("./entry.js");

	expect(order).toEqual(["async start", "sibling", "async end"]);
	order.length = 0;
	expect(force()).toBe(2);
	expect(order).toEqual(["deferred body"]);
});
