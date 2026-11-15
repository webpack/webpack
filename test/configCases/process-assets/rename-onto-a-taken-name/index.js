const fs = require("fs");
const path = require("path");

it("should keep the file that already holds the name", () => {
	expect(fs.readFileSync(path.join(__dirname, "taken.txt"), "utf8")).toBe("second");
});
