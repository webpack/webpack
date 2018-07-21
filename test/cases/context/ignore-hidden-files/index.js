it("should ignore hidden files", function() {
	(function() {
		var name = "./file.js";
		require("./folder/" + name);
	}).should.throw();
});