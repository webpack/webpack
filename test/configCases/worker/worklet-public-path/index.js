const fs = require("fs");
const path = require("path");

const context = new AudioContext();

context.audioWorklet.addModule(new URL("./worklet.js", import.meta.url));

it("should use output.workerPublicPath for worklet chunks", () => {
	const source = fs.readFileSync(path.join(__dirname, "main.js"), "utf-8");
	expect(source).toMatch("/workletPublicPath/");
});
