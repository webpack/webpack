import { Worker } from "worker_threads";

it("should define public path", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	worker.postMessage("ok");

	var fs = require("fs"),
		path = require("path");
	var source = fs.readFileSync(path.join(__dirname, "main.js"), "utf-8");
	expect(source).toMatch("workerPublicPath2");
	await worker.terminate()
});
