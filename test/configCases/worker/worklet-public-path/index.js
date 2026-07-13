const fs = require("fs");
const path = require("path");

const context = new AudioContext();

context.audioWorklet.addModule(new URL("./worklet.js", import.meta.url));

it("should use output.workerPublicPath for worklet chunks", () => {
	const source = fs.readFileSync(path.join(__dirname, "main.js"), "utf-8");
	expect(source).toMatch("/workletPublicPath/");
});

it("should add a self-contained worklet chunk directly, without a bootstrap", () => {
	const source = fs.readFileSync(path.join(__dirname, "main.js"), "utf-8");
	// Build the marker from fragments so this file's own source (bundled into
	// main.js) can't match it — only the generated bootstrap wrapper would.
	const bootstrapArg = ["__webpack", "worklet", "module__"].join("_");
	expect(source).not.toContain(bootstrapArg);
});
