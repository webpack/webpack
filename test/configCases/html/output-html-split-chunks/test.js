const fs = require("fs");
const path = require("path");
const vm = require("vm");

const read = (file) => fs.readFileSync(path.resolve(__dirname, file), "utf-8");
// Match the `src` attribute rather than the whole tag — the page only puts
// `src` on `<script>` (links use `href`), and an attribute regexp avoids
// CodeQL's bad-HTML-tag-filter rule.
const scriptSrcs = (html) =>
	Array.from(html.matchAll(/src="([^"]+)"/g)).map((m) => m[1]);

it("injects the runtime and vendor chunks before the entry chunk", () => {
	const srcs = scriptSrcs(read("app.html"));
	// runtime, vendor, app
	expect(srcs).toHaveLength(3);
	expect(srcs[0]).toMatch(/runtime/);
	expect(srcs[1]).toMatch(/vendor/);
});

it("executes with the split chunks loaded in order", () => {
	const contents = scriptSrcs(read("app.html")).map(read);
	const sandbox = {};
	sandbox.self = sandbox;
	vm.createContext(sandbox);
	for (const content of contents) vm.runInContext(content, sandbox);
	expect(sandbox.order).toEqual(["APP:LIB_VALUE"]);
});
