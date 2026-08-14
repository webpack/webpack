import fs from "fs";
import path from "path";
import { Worker } from "worker_threads";

it("should leave top-level this alone in a module worker", async () => {
	const worker = new Worker(new URL("./w.js", import.meta.url), {
		type: "module"
	});
	await worker.terminate();

	// an ES module's top-level `this` is undefined, so there is nothing to
	// resolve it to and the exports semantics stay
	const emitted = fs
		.readdirSync(__STATS__.outputPath)
		.filter(name => name !== "bundle0.mjs")
		.map(name => fs.readFileSync(path.join(__STATS__.outputPath, name), "utf8"))
		.join("\n");

	expect(emitted).toContain("onmessage");
	expect(emitted).not.toContain(`${"__webpack_require__"}.g`);
});
