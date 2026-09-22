import "./page.html";

const readStyle = require("./helper");

const SHEET = ".a { color: green; }\n";

it("should write a header for the sheet the rebuild read", () => {
	const style = readStyle(STATS_JSON);

	// The sheet changed, so the module it is read as changed with it: a header
	// held over from the build before would name the sheet that is no longer
	// there, and one cached against that module would still read `red`.
	expect(style.headers).toHaveLength(1);
	expect(style.html).not.toContain(".stale");
	expect(style.names).toBe(SHEET);
	expect(style.heads).toBe(SHEET);
});
