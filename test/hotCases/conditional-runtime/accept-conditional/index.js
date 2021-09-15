it("should create a conditional import when accepted", done => {
	if (Math.random() < 0) new Worker(new URL("worker.js", import.meta.url));
	import("./module")
		.then(module =>
			module.test(callback => {
				NEXT(require("../../update")(done, undefined, callback));
			}, done)
		)
		.catch(done);
});
