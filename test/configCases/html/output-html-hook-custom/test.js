const fs = require("fs");
const path = require("path");

it("lets a custom plugin tap the entry hook to wrap a non-HTML entry in HTML", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "main.html"), "utf-8");
	expect(html).toContain("<h1>From plugin</h1>");
	expect(html).toMatch(/<script src="[^"]+\.js"><\/script>/);
});
