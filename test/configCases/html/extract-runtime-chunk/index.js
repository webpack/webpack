const fs = require("fs");
const path = require("path");

require("./page.html");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should load the shared runtime chunk exactly once even when multiple <script src> entries chain via dependOn", () => {
	const extracted = readFile("page.html");
	expect(extracted).toMatchSnapshot();
	// Three <script src> tags total — runtime + leader entry + dependant
	// entry. Use exec()-in-a-loop instead of String.prototype.matchAll for
	// compatibility with legacy Node.js.
	const scriptSrcRe = /<script[^>]+\bsrc="([^"]+)"[^>]*>/g;
	const scriptSrcMatches = [];
	for (let m; (m = scriptSrcRe.exec(extracted)); ) scriptSrcMatches.push(m[1]);
	expect(scriptSrcMatches).toHaveLength(3);
	const runtimeRefs = scriptSrcMatches.filter((u) => u.includes("html-runtime"));
	// The runtime chunk must appear exactly once, before the entry chunks
	// — otherwise the second entry chunk would re-bootstrap the runtime
	// and overwrite the leader's module registry.
	expect(runtimeRefs).toHaveLength(1);
	expect(scriptSrcMatches[0]).toContain("html-runtime");
	expect(scriptSrcMatches[1]).toMatch(/__html_[a-f0-9]+_0\.chunk\.js/);
	expect(scriptSrcMatches[2]).toMatch(/__html_[a-f0-9]+_1\.chunk\.js/);
	// All referenced chunks were emitted to disk.
	expect(readFile(scriptSrcMatches[0])).toContain("__webpack_require__");
	expect(readFile(scriptSrcMatches[1])).toContain('module.exports = "entry"');
	expect(readFile(scriptSrcMatches[2])).toContain('module.exports = "other"');
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
