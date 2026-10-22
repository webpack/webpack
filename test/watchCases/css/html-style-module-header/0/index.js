import "./page.html";

const readStyle = require("./helper");

const SHEET = ".a { color: red; }\n";

it("should head the sheet with the module it read, not the one the page came with", () => {
	const style = readStyle(STATS_JSON);

	// The page arrives headed twice over, as one built by a webpack that kept
	// the header it read does. They were those builds', so this one sheds the
	// stack whole and writes its own — one header, however many it was given.
	expect(style.headers).toHaveLength(1);
	expect(style.html).not.toContain(".stale");
	expect(style.html).not.toContain(".staler");

	// The module it names is the sheet the author wrote, so what the build read
	// is the sheet alone and not the sheet under a header.
	expect(style.names).toBe(SHEET);

	// And the sheet comes back out as the page holds it: a newline appended
	// under it would be a line the body gains on every build of the page.
	expect(style.heads).toBe(SHEET);
});
