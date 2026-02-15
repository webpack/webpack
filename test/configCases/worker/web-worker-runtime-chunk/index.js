it("should not crash when using workers with runtimeChunk", function (done) {
	const worker = new Worker(new URL("./worker.js", import.meta.url));
	worker.onmessage = function (event) {
		expect(event.data).toBe("worker response: hello");
		worker.terminate();
		done();
	};
	worker.postMessage("hello");
});
