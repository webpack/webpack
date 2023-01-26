const worker = new Worker(new URL("./worker.js", import.meta.url), {
	type: "module"
});
// TODO test worker url???
worker.postMessage("ok");
