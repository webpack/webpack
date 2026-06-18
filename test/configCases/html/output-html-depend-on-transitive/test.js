const fs = require("fs");
const path = require("path");
const vm = require("vm");

const read = (file) => fs.readFileSync(path.resolve(__dirname, file), "utf-8");
// Match the `src` attribute rather than the whole tag — the page only puts
// `src` on `<script>` (links use `href`), and an attribute regexp avoids
// CodeQL's bad-HTML-tag-filter rule.
const scriptSrcs = (html) =>
	Array.from(html.matchAll(/src="([^"]+)"/g)).map((m) => m[1]);

it("injects the whole transitive dependOn chain in load order", () => {
	const srcs = scriptSrcs(read("app.html"));
	// base, mid1, mid2, app
	expect(srcs).toHaveLength(4);
});

it("loads the diamond's shared base exactly once", () => {
	const contents = scriptSrcs(read("app.html")).map(read);
	const baseFiles = contents.filter((c) => c.includes('"BASE"'));
	expect(baseFiles).toHaveLength(1);
});

it("executes the diamond in topological order", () => {
	const contents = scriptSrcs(read("app.html")).map(read);
	const sandbox = {};
	sandbox.self = sandbox;
	vm.createContext(sandbox);
	for (const content of contents) vm.runInContext(content, sandbox);
	expect(sandbox.order).toEqual(["BASE", "MID1:B", "MID2:B", "APP:M1M2"]);
});
