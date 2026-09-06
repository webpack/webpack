import module from "./module";

it("should apply both runtimes' updates where one manifest filename serves both", done => {
	import("./chunk1").then(chunk1 => {
		import.meta.webpackHot.accept("./module", async () => {
			expect(module).toBe(42);
			expect(chunk1).toMatchObject({
				// Dropping [runtime] from the filename is what warnings1.js warns
				// about: both manifests merge, so the worker's removals land here too.
				active: false
			});
			done();
		});
		NEXT(require("../../update")(done));
	}, done);
});
