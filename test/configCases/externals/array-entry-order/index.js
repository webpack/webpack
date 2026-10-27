it("should keep the order of string entries in an externals array", () => {
	const os = require("os");
	expect(typeof os.platform).toBe("function");
	const path = require("path");
	expect(typeof path.join).toBe("function");
	expect(path.platform).toBeUndefined();
	expect(require("node:path")).toBe(path);
	expect(typeof require("util").inspect).toBe("function");
	expect(require("os-alias")).toBe(os);
});
