const fs = require("fs");
const path = require("path");

it("applies the html parser template option to generated HTML", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "main.html"), "utf-8");
	expect(html).toContain("<title>MyApp</title>");
	expect(html).toMatch(/<script src="[^"]+\.js"><\/script>/);
});
