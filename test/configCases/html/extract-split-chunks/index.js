const fs = require("fs");
const path = require("path");

require("./page.html");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should reference both the split-out vendor chunk and the entry chunk", () => {
	const extracted = readFile("page.html");
	expect(extracted).toMatchSnapshot();
	// Use exec()-in-a-loop instead of String.prototype.matchAll for
	// compatibility with legacy Node.js.
	const scriptSrcRe = /<script src="([^"]+)">/g;
	const scriptSrcMatches = [];
	for (let m; (m = scriptSrcRe.exec(extracted)); ) scriptSrcMatches.push(m[1]);
	// One tag per chunk in the entry's chunk group: vendor + entry.
	expect(scriptSrcMatches).toHaveLength(2);
	const [vendorUrl, entryUrl] = scriptSrcMatches;
	expect(vendorUrl).toContain("vendor");
	expect(entryUrl).toMatch(/__html_[a-f0-9]+_0\.chunk\.js/);
	// vendor.js is a separate file and the entry chunk references it via require.
	expect(readFile(vendorUrl)).toContain('"vendor-module"');
	expect(readFile(entryUrl)).toContain("entry:");
});
