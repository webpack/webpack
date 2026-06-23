// Avoid errors because of self-signed certificate
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

it("should compile to lazy imported module", (done) => {
	let resolved;
	const promise = import("./module").then((r) => (resolved = r));
	let generation = 0;
	import.meta.webpackHot.accept("./module", () => {
		generation++;
	});
	expect(resolved).toBe(undefined);
	expect(generation).toBe(0);
	// The dynamic import above activates ./module on the lazy-compilation backend
	// over an async (HTTPS) request; under load it can land after the first
	// recompile, leaving the module a proxy so the rebuild yields "No update
	// available". Re-run the same version until the activation arrives.
	const awaitActivation = (retries) => (err) => {
		if (err) return done(err);
		module.hot
			.check(true)
			.then((updatedModules) => {
				if (!updatedModules) {
					if (retries <= 0) return done(new Error("No update available"));
					return setTimeout(() => NEXT_RETRY(awaitActivation(retries - 1)), 300);
				}
				promise.then((result) => {
					expect(result).toHaveProperty("default", 42);
					expect(generation).toBe(0);
					NEXT(
						require("../../update")(done, true, () => {
							expect(result).toHaveProperty("default", 42);
							expect(generation).toBe(1);
							import("./module").then((result) => {
								expect(result).toHaveProperty("default", 43);
								setTimeout(() => {
									done();
								}, 1000);
							}, done);
						})
					);
				}, done);
			})
			.catch(done);
	};
	NEXT_DEFERRED(awaitActivation(20));
});
