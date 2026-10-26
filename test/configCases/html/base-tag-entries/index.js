const fs = require("fs");
const path = require("path");

it("should resolve script and stylesheet entries through a relative <base href>", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	// Both only exist under `nested/`, so a successful build proves they were
	// requested through the base; the emitted URLs cancel it with `../`.
	expect(html).toMatch(/<script src="\.\.\/app\.js"><\/script>/);
	expect(html).toMatch(/<link rel="stylesheet" href="\.\.\/[^"]+\.css">/);
	expect(html).toMatch(/<img src="\.\.\/[^"]+\.png" alt="resolved via base">/);
});
