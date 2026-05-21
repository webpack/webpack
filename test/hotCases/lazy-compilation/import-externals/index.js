import update from "../../update.esm.js";

it("first activation of a lazy import with an 'import' external must not throw", (done) => {
	let resolved;
	const promise = import("./module.js").then((r) => (resolved = r));
	expect(resolved).toBe(undefined);
	NEXT_DEFERRED(
		update(done, true, () => {
			promise.then((result) => {
				expect(result).toHaveProperty("default", "answer=42");
				done();
			}, done);
		})
	);
});
