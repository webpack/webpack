const fs = require("fs");
const path = require("path");

it("should place the banner after the code when footer is set", () => {
	const lines = fs
		.readFileSync(path.join(__dirname, "footer.js"), "utf-8")
		.split("\n");
	expect(lines[lines.length - 1]).toBe("/*! banner is a string */");
	expect(lines[0]).not.toContain("banner is a string");
});
