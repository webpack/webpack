const fs = require("fs");
const path = require("path");

it("should add the banner at the stage it is given", () => {
	const source = fs.readFileSync(path.join(__dirname, "staged.js"), "utf-8");
	expect(source.split("\n")[0]).toBe("/* banner is a string */");
});
