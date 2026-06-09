const fs = require("fs");
const path = require("path");

it("only generates HTML for the entry that opts in via html:true", () => {
	expect(fs.existsSync(path.resolve(__dirname, "a.html"))).toBe(false);
	expect(fs.existsSync(path.resolve(__dirname, "c.html"))).toBe(true);
});
