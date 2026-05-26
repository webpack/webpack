const fs = require("fs");
const path = require("path");

it("should resolve `./src` to src/index.html over src/index.js", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
	expect(html).toContain("<title>Default entry HTML</title>");
});
