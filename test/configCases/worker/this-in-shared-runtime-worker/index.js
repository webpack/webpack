it("should keep exports semantics when a worker shares a non-worker runtime", () => {
	const shared = require("./shared.js");
	// eslint-disable-next-line no-unused-vars
	const worker = new Worker(new URL("./shared.js", import.meta.url), {
		/* webpackEntryOptions: { runtime: "shared-rt" } */
	});
	expect(shared.marker).toBe("assigned");
});
