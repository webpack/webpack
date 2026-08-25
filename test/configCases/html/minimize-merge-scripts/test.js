const fs = require("fs");
const path = require("path");

const page = fs
	.readFileSync(path.resolve(__dirname, "page.html"))
	.toString("utf-8");

it("folds the inlined runtime and entry into one <script>", () => {
	expect(page.match(/<script\b/g)).toHaveLength(1);
	expect(page).not.toContain("</script><script");
});

it("writes the newline and `;` the join needs", () => {
	// The runtime's last statement must not run into the entry's first.
	expect(page).toContain("\n;");
});

it("keeps both chunks' code", () => {
	expect(page).toContain("webpackChunk");
	expect(page).toContain("console.log");
});
