import fs from "fs";
import path from "path";

import { value } from "./sibling";

it("should run the entry module", () => {
	expect(value).toBe("sibling");
});

it("should ship the startup helper only where the startup calls it", () => {
	const runtime = fs.readFileSync(
		path.join(
			__STATS__.children[__INDEX__].outputPath,
			__NAME__,
			"runtime.js"
		),
		"utf8"
	);

	expect(runtime.includes("webpack/runtime/startup entrypoint")).toBe(
		__AWAITED__
	);
	expect(runtime.includes(`${"__webpack_require__"}.X =`)).toBe(__AWAITED__);
});
