const fs = require("fs");
const path = require("path");

it("generates an HTML file for a JS entry with the bundle and CSS injected", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "main.html"), "utf-8");
	expect(html).toMatch(/<script defer src="[^"]+\.js"><\/script>/);
	expect(html).toMatch(/<link rel="stylesheet" href="[^"]+\.css">/);
});
