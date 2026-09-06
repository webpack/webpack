const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should copy a directory named by a bare string", () => {
	expect(read("one.txt")).toBe("one");
	expect(read("nested/two.txt")).toBe("two");
});
