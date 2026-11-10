const path = require("path");
const alsoPath = require("also-path");
const os = require("os");

it("should compile and report the externals nothing imports", () => {
	expect(typeof path.join).toBe("function");
	expect(alsoPath).toBe(path);
	expect(typeof os.platform).toBe("function");
});
