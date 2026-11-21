const fs = require("fs");
const path = require("path");

it("should not copy a file outside the output path", () => {
	expect(fs.existsSync(path.resolve(__dirname, "../outside-future.txt"))).toBe(
		false
	);
});

it("should still copy what stays inside", () => {
	expect(fs.readFileSync(path.resolve(__dirname, "ok.txt"), "utf-8")).toBe(
		"fine\n"
	);
});
