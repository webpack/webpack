const fs = require("fs");
const path = require("path");

const page = fs
	.readFileSync(path.resolve(__dirname, "page.html"))
	.toString("utf-8");

it("folds the inlined runtime and entry into one <script>", () => {
	expect(page.match(/<script\b/g)).toHaveLength(1);
	expect(page).not.toContain("</script><script");
});

it("does not let the runtime's last statement run into the entry's first", () => {
	// The `\n;` the printer writes is checked in HtmlSyntax.unittest.js; a JS
	// minimizer runs over the merged body afterwards and respells it.
	expect(page).toContain("})();,");
});

it("keeps both chunks' code", () => {
	expect(page).toContain("webpackChunk");
	expect(page).toContain("console.log");
});
