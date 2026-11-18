import fs from "fs";
import { fileURLToPath } from "url";
import { Worker } from "worker_threads";
import { fileUrl as objectFormUrl } from "./object-form";

it("should emit the asset of new URL() when importMeta is false", () => {
	const url = new URL("./file.txt", import.meta.url);
	expect(url.pathname).not.toMatch(/\/file\.txt$/);
	expect(fs.readFileSync(fileURLToPath(url), "utf8")).toBe("data\n");
});

it("should emit the asset of new URL() when importMeta.url is false", () => {
	expect(objectFormUrl.pathname).not.toMatch(/\/file\.txt$/);
	expect(fs.readFileSync(fileURLToPath(objectFormUrl), "utf8")).toBe("data\n");
});

it("should keep a bare import.meta.url when importMeta is false", () => {
	const moduleUrl = import.meta.url;
	expect(typeof moduleUrl).toBe("string");
});

it("should emit the worker of new Worker(new URL()) when importMeta is false", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	const result = await new Promise((resolve, reject) => {
		worker.on("message", resolve);
		worker.on("error", reject);
		worker.postMessage("hello");
	});
	expect(result).toBe("hello from worker");
	await worker.terminate();
});
