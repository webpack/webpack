it("should create a conditional import when accepted", done => {
	if (Math.random() < 0) new Worker(new URL("worker.js", import.meta.url));
	import("./module")
		.then(module => module.test(done))
		.catch(done);
});
