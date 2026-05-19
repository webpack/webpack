const fs = require("fs");
const path = require("path");

require("./page.html");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should reference the runtime chunk in addition to the entry chunk", () => {
	const extracted = readFile("page.html");
	expect(extracted).toMatchSnapshot();
	// Two <script src> tags now sit where the original single one was — the
	// runtime chunk in front of the entry chunk. Use exec()-in-a-loop instead
	// of String.prototype.matchAll for compatibility with legacy Node.js.
	const scriptSrcRe = /<script[^>]+\bsrc="([^"]+)"[^>]*>/g;
	const scriptSrcMatches = [];
	for (let m; (m = scriptSrcRe.exec(extracted)); ) scriptSrcMatches.push(m[1]);
	expect(scriptSrcMatches).toHaveLength(2);
	// The runtime chunk must be loaded first so the entry chunk has
	// `__webpack_require__` available when it runs.
	const [runtimeUrl, entryUrl] = scriptSrcMatches;
	expect(runtimeUrl).toMatch(/html-runtime/);
	expect(entryUrl).toMatch(/__html_[a-f0-9]+_0\.chunk\.js/);
	// Both chunks were emitted to disk.
	expect(readFile(runtimeUrl)).toContain("__webpack_require__");
	expect(readFile(entryUrl)).toContain('module.exports = "entry"');
});

it("should propagate safe attributes onto the sibling runtime <script> tag and drop integrity", () => {
	const extracted = readFile("page.html");
	// The runtime chunk's <script> sibling inherits the original tag's
	// CSP/CORS attributes — without these, browsers would block the
	// runtime under a strict CSP that whitelists nonces.
	expect(extracted).toMatch(
		/<script[^>]*\bsrc="[^"]*html-runtime\.js"[^>]*\bnonce="abc"/
	);
	expect(extracted).toMatch(
		/<script[^>]*\bsrc="[^"]*html-runtime\.js"[^>]*\bcrossorigin="anonymous"/
	);
	// `integrity` is content-specific to the original entry chunk and must
	// NOT be copied onto sibling tags — browsers would reject the runtime
	// chunk because its bytes don't match the entry chunk's hash.
	expect(extracted).not.toMatch(
		/<script[^>]*\bsrc="[^"]*html-runtime\.js"[^>]*\bintegrity=/
	);
	// The original entry tag keeps its own integrity attribute untouched.
	expect(extracted).toMatch(
		/<script[^>]*\bsrc="[^"]*__html_[^"]+\.chunk\.js"[^>]*\bintegrity="sha384-IGNOREME"/
	);
});
