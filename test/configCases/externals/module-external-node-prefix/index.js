import { sep } from "path";
import fs from "fs";

it("should emit the node: prefix for core-module ESM externals", () => {
	expect(typeof sep).toBe("string");

	const content = fs.readFileSync(__filename, "utf-8");
	expect(content).toContain("node:path");
});
