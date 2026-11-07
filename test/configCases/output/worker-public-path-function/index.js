import { Worker } from "worker_threads";

it("should define worker public path function", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	worker.postMessage("ok");

	var fs = require("fs"),
		path = require("path");
	var source = fs.readFileSync(path.join(__dirname, "main.js"), "utf-8");
	expect(source).toMatch("/worker-custom/");
	expect(source).toMatch(
		"function(path, publicPath) { return '/worker-custom/' + path; }"
	);
	await worker.terminate();
});

it("should have __webpack_require__.W as a function", () => {
	expect(__webpack_require__.W).toBeTypeOf("function");
});

it("should have default workerPublicPathFunction behavior", () => {
	expect(__webpack_require__.W("worker.js", "/base/")).toBe("/base/worker.js");
});
