import { value } from "./m";

it("should drop modules a deferred rebuild stopped importing (step 1)", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const content = fs.readFileSync(path.resolve(__dirname, "bundle.js"), "utf8");
	expect(value).toBe(2);
	expect(content).not.toContain(`__X_${"MARKER"}__`);
});
