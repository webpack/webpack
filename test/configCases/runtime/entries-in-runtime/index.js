import path from "path";
import fs from "fs";

it("should not have references to chunks of unrelated entrypoints in runtime", () => {
	const content = fs.readFileSync(
		path.resolve(__dirname, "runtime.js"),
		"utf-8"
	);
	expect(content).not.toContain("other-entry");
	expect(content).not.toContain("split");
});
