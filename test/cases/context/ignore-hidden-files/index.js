it("should ignore hidden files", function() {
	expect(function() {
		var name = "./file.js";
		require("./folder/" + name);
	}).toThrowError();
});