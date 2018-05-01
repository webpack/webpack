it("should assign different names to the same module with different issuers ", function() {
	var regex = "\\./c\\.js\\?\\w{4}";
	expect(require("./c")).toMatch(new RegExp(regex));
	expect(require("./a")).toMatch(new RegExp("loader-a" + regex));
	expect(require("./b")).toMatch(new RegExp("loader-b" + regex));
});
