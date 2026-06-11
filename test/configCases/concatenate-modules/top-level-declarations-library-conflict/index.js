import fs from "fs";
import { getValue } from "./module";

it("should isolate the entry when a concatenated declaration conflicts with the library name", () => {
	// the library assignment must not clobber the inner MyLib function
	expect(getValue()).toBe(42);
	const source = fs.readFileSync(__filename, "utf-8");
	// string split to not match this test's own source
	expect(source).toContain(
		"declares 'MyLib' on top-level, " + "which conflicts with the current library output"
	);
});
