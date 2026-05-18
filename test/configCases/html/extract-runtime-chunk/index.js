const fs = require("fs");
const path = require("path");

require("./page.html");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should reference the runtime chunk in addition to the entry chunk", () => {
	const extracted = readFile("page.html");
	expect(extracted).toMatchSnapshot();
	// Two <script src> tags now sit where the original single one was — the
	// runtime chunk in front of the entry chunk.
	const scriptSrcMatches = [
		...extracted.matchAll(/<script src="([^"]+)">/g)
	].map((m) => m[1]);
	expect(scriptSrcMatches).toHaveLength(2);
	// The runtime chunk must be loaded first so the entry chunk has
	// `__webpack_require__` available when it runs.
	const [runtimeUrl, entryUrl] = scriptSrcMatches;
	expect(runtimeUrl).toContain("html-runtime");
	expect(entryUrl).toMatch(/__html_[a-f0-9]+_0\.chunk\.js/);
	// Both chunks were emitted to disk.
	expect(readFile(runtimeUrl)).toContain("__webpack_require__");
	expect(readFile(entryUrl)).toContain('module.exports = "entry"');
});
