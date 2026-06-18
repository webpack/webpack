const fs = require("fs");
const path = require("path");
const vm = require("vm");

const read = (file) => fs.readFileSync(path.resolve(__dirname, file), "utf-8");
// Match the `src` attribute rather than the whole tag — the page only puts
// `src` on `<script>` (links use `href`), and an attribute regexp avoids
// CodeQL's bad-HTML-tag-filter rule.
const scriptSrcs = (html) =>
	Array.from(html.matchAll(/src="([^"]+)"/g)).map((m) => m[1]);

it("injects the dependOn ancestor's script before the entry's own", () => {
	const srcs = scriptSrcs(read("app.html"));
	// shared (the dependOn target) first, then app
	expect(srcs).toHaveLength(2);
});

it("does not duplicate the shared module into the dependant chunk", () => {
	const contents = scriptSrcs(read("app.html")).map(read);
	const sharedFiles = contents.filter((c) => c.includes("SHARED_MARKER"));
	const appFiles = contents.filter((c) => c.includes("APP_MARKER"));
	// dependOn keeps shared in its own chunk instead of inlining it into app
	expect(sharedFiles).toHaveLength(1);
	expect(appFiles).toHaveLength(1);
	expect(sharedFiles[0]).not.toBe(appFiles[0]);
});

it("executes the page in order with a single shared runtime", () => {
	const contents = scriptSrcs(read("app.html")).map(read);
	const sandbox = {};
	sandbox.self = sandbox;
	vm.createContext(sandbox);
	for (const content of contents) vm.runInContext(content, sandbox);
	expect(sandbox.order).toEqual(["SHARED_MARKER", "APP_MARKER:shared-value"]);
});

it("emits a standalone HTML file for the dependOn target", () => {
	const srcs = scriptSrcs(read("shared.html"));
	expect(srcs).toHaveLength(1);
});
