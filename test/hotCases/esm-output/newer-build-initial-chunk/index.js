import value from "./value";

import.meta.webpackHot.accept("./value");

it("should catch up before running a chunk that is also initial elsewhere", (done) => {
	// Build two updates and apply none, so import() finds the second build's
	// shared chunk on disk.
	NEXT(() => {
		NEXT(() => {
			import(/* webpackChunkName: "page" */ "./page").then((page) => {
				// The first update replaces the loaded chunk's modules too, so the
				// client catches up to that build and stays consistent.
				expect(value).toBe(2);
				expect(page.default).toBe(2);
				done();
			}).catch(done);
		});
	});
});
