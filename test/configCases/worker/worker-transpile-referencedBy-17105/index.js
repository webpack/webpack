// Regression test for #17105: Transpiling with a Web Worker (webpack 5 worker import syntax) crashes Webpack.
// Without the fix in Compilation.js (guard for otherInfo when other is not a runtime chunk), the build
// crashes with: TypeError: Cannot read properties of undefined (reading 'referencedBy') at createHash.
it("should build and run when worker is transpiled (regression #17105)", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	worker.postMessage("ping");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("pong");
	await worker.terminate();
});
