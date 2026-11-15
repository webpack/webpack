const fs = require("fs");
const path = require("path");

it("should keep a file both maps of a merged pair would move onto", () => {
	const file = path.join(__dirname, `${"c".repeat(8)}.js.map`);
	expect(fs.readFileSync(file, "utf8")).toBe("unrelated");
});
