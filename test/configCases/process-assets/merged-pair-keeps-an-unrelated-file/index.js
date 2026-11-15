const fs = require("fs");
const path = require("path");

it("should keep a file that only shares the name a merged asset's map moves to", () => {
	const c = "c".repeat(8);
	expect(fs.readFileSync(path.join(__dirname, `${c}.js.map`), "utf8")).toBe("map c");
});
