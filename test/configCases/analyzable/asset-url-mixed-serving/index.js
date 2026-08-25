import fs from "fs";
import path from "path";
import { url } from "./shared";

const stats = __STATS__;
const read = (...parts) =>
	fs.readFileSync(path.join(stats.outputPath, ...parts), "utf8");

it("should point at the asset through the public path", () => {
	// Nothing is emitted there — the public path is where the output root is served.
	expect(url.href.endsWith("/media/asset.txt")).toBe(true);
});

it("should give each chunk the path right where it is read from", () => {
	// Built at runtime so the needle is not a source string literal here.
	const runtimeForm = `${"__webpack_require__"}.p + ${JSON.stringify("asset.txt")}`;

	// The host fetched this one, so it is not under the public path yet.
	expect(read("bundle0.mjs")).toContain('"./media/asset.txt"');
	// Webpack fetched this one through the public path, and it sits a directory down.
	expect(read("c/on-demand.mjs")).toContain('"../asset.txt"');
	expect(read("bundle0.mjs")).not.toContain(runtimeForm);
	expect(read("c/on-demand.mjs")).not.toContain(runtimeForm);
});
