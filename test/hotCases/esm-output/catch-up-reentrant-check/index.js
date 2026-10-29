import value from "./value";

import.meta.webpackHot.accept("./value");

it("should reject a check a status handler returns while the runtime catches up", (done) => {
	// Build two updates and apply none, so import() finds the second build's chunk.
	NEXT(() => {
		NEXT(() => {
			import.meta.webpackHot.addStatusHandler((status) =>
				status === "prepare" ? import.meta.webpackHot.check(true) : undefined
			);
			import(/* webpackChunkName: "page" */ "./page").then(
				() => done(new Error("The import should fail")),
				(err) => {
					expect(err.message).toBe("check() is only allowed in idle status");
					expect(value).toBe(1);
					done();
				}
			);
		});
	});
});
