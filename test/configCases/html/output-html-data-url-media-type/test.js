const fs = require("fs");
const path = require("path");

const emitted = (prefix, ext) =>
	fs
		.readdirSync(__dirname)
		.filter((f) => f.startsWith(prefix) && f.endsWith(ext));

it("keeps a data:text/htmlx entry as JavaScript, not as a page", () => {
	expect(emitted("data-url.", ".js")).toHaveLength(1);
	expect(emitted("data-url.", ".html")).toHaveLength(0);
});

it("gives a generated page's filename to the script extracted from it", () => {
	expect(emitted("page.", ".html")).toHaveLength(1);
	const [chunk] = emitted("page.", ".js");
	expect(chunk).toBeDefined();
	// The entry's filename now carries the page's script, not a copy of it.
	const js = fs.readFileSync(path.resolve(__dirname, chunk), "utf-8");
	expect(js).not.toContain("<!doctype html>");
});
