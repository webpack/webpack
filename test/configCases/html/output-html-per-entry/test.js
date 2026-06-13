const fs = require("fs");
const path = require("path");

it("respects per-entry html:false override of output.html:true", () => {
	expect(fs.existsSync(path.resolve(__dirname, "a.html"))).toBe(true);
	expect(fs.existsSync(path.resolve(__dirname, "b.html"))).toBe(false);
});
