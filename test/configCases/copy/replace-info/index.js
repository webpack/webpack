const fs = require("fs");
const path = require("path");

const target = path.resolve(__dirname, "run.sh");

it("should take the content of the later copy", () => {
	expect(fs.readFileSync(target, "utf-8")).toBe("second\n");
});

it("should not inherit the mode of the copy it replaced", () => {
	expect(fs.statSync(target).mode & 0o777).toBe(0o644);
});
