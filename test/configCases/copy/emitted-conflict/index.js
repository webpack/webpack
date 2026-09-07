const fs = require("fs");
const path = require("path");

it("should keep the bundle a copy would have replaced", () => {
	expect(fs.readFileSync(__filename, "utf-8")).not.toBe("clobber");
});

it("should copy what does not conflict", () => {
	expect(
		fs.readFileSync(path.resolve(__dirname, "note.txt"), "utf-8")
	).toBe("fine");
});
