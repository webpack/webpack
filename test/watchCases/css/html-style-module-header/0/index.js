import "./page.html";

const readStyle = require("./helper");

const SHEET = ".a { color: red; }\n";

it("should head the sheet with the module it read, not the one the page came with", () => {
	const style = readStyle(STATS_JSON);

	// The page arrives with a header of its own, as a page an earlier build
	// emitted does. That one was the build before's, so this build sheds it and
	// writes its own — one header, not two.
	expect(style.headers).toHaveLength(1);
	expect(style.html).not.toContain(".stale");

	// The module it names is the sheet the author wrote, so what the build read
	// is the sheet alone and not the sheet under a header.
	expect(style.names).toBe(SHEET);

	// And the sheet comes back out as the page holds it: a newline appended
	// under it would be a line the body gains on every build of the page.
	expect(style.heads).toBe(SHEET);
});
