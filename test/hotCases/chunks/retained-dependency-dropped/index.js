import store from "./store";
import "./holder";

module.hot.accept("./holder");

const next = (done, callback) =>
	NEXT(require("../../update")(done, true, callback));

it("should stop updating a dependency a retained module no longer imports", (done) => {
	expect(store.modRuns).toBe(1);
	// The module moves to an async chunk; the client keeps running it.
	next(done, () => {
		expect(store.modRuns).toBe(1);
		// The retained module imports a new dependency.
		next(done, () => {
			expect(store.modRuns).toBe(2);
			// It drops the dependency again.
			next(done, () => {
				expect(store.modRuns).toBe(3);
				// A change to the dependency no longer reaches this client.
				next(done, () => {
					expect(store.modRuns).toBe(3);
					expect(store.depDisposed).toBe(undefined);
					done();
				});
			});
		});
	});
});
