const worker = new Worker(new URL("./worker.js", import.meta.url), {
	type: "module"
});
worker.postMessage("ok");
