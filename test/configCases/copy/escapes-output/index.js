const fs = require("fs");
const path = require("path");

it("should copy a file outside the output path with a warning", () => {
	expect(fs.readFileSync(path.resolve(__dirname, "../outside.txt"), "utf-8")).toBe(
		"copied outside\n"
	);
});

it("should still copy what stays inside", () => {
	expect(fs.readFileSync(path.resolve(__dirname, "ok.txt"), "utf-8")).toBe(
		"fine\n"
	);
});
