import * as fs from "fs";

it("should use workerChunkFilename for an entry marked worker: true", () => {
	const files = fs.readdirSync(__dirname);
	// the `worker: true` entry uses output.workerChunkFilename
	expect(files).toContain("worker-worker.js");
	expect(files).not.toContain("worker.js");
	// a normal entry still uses output.filename
	expect(files).toContain("main.js");
});
