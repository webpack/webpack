it("should assign different names to the same module with different issuers ", function() {
	var fs = require("fs");
	var path = require("path");
	var bundle = fs.readFileSync(path.join(__dirname, "main.js"), "utf-8");
	expect(bundle.match(/"\.\/c\.js\?\w{4}":/g)).toHaveLength(2);
	expect(require("./a")).toEqual("loader-a");
	expect(require("./b")).toEqual("loader-b");
});
