const fs = require("fs");
const path = require("path");

const exists = (name) => fs.existsSync(path.resolve(__dirname, name));

it("should leave the output path out when the hook says so", () => {
	expect(exists("build")).toBe(false);
	expect(exists("keep.txt")).toBe(true);
	expect(exists("nested/deep.txt")).toBe(true);
});
