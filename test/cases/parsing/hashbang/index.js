it("should load a file with hashbang", function () {
	var result = require("./file.js");
	expect(result).toEqual("ok");
});

import result from "./file.mjs";
it("should load a module with hashbang", function () {
	expect(result).toEqual("ok");
});
