import fs from "fs";
import path from "path";
import { load } from "./shared.js";

const stats = __STATS__;
const shared = () =>
	fs.readFileSync(path.join(stats.outputPath, "shared.mjs"), "utf8");

// Not loaded: the public path relocates the chunk, so the harness cannot resolve it.
it("should keep the chunk referenced", () => {
	expect(typeof load).toBe("function");
});

it("should keep the runtime form in a chunk served at two urls", () => {
	// Built at runtime so the needles are not source string literals here.
	expect(shared()).toContain(`${"__webpack_require__"}.e(`);
	expect(shared()).not.toContain(`${"import"}("./media/`);
});
