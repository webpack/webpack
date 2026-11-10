// Node.js trusts the self-signed certificate through NODE_EXTRA_CA_CERTS (see
// test/harness/globalSetup.js); Bun and Deno need verification turned off
if (process.versions.bun || process.versions.deno) {
	process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
}

it("should compile to lazy imported module", (done) => {
	let resolved;
	const promise = import("./module").then((r) => (resolved = r));
	let generation = 0;
	import.meta.webpackHot.accept("./module", () => {
		generation++;
	});
	expect(resolved).toBe(undefined);
	expect(generation).toBe(0);
	// The dynamic import above activates ./module on the lazy-compilation backend over
	// an async request; under load that can land after the first recompile, leaving
	// the module a proxy so the rebuild yields "No update available".
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
								}, 100);
							}, done);
						})
					);
				}, done);
			})
			.catch(done);
	};
	NEXT_DEFERRED(awaitActivation(20));
});
