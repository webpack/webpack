const fs = require("fs");

const chunks = (prefix) =>
	fs
		.readdirSync(__dirname)
		.filter((f) => f.startsWith(prefix) && f.endsWith(".js"));

const pages = (prefix) =>
	fs
		.readdirSync(__dirname)
		.filter((f) => f.startsWith(prefix) && f.endsWith(".html"));

it("emits a data:text/htmlx entry as a page, with no JS copy of it", () => {
	expect(pages("data-url.")).toHaveLength(1);
	expect(chunks("data-url.")).toHaveLength(0);
});

it("gives a generated page's filename to the script extracted from it", () => {
	expect(pages("page.")).toHaveLength(1);
	expect(chunks("page.")).toHaveLength(1);
	const js = fs.readFileSync(`${__dirname}/${chunks("page.")[0]}`, "utf-8");
	expect(js).not.toContain("<!doctype html>");
});
