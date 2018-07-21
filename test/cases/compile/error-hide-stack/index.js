it("should hide stack in details", function() {
	(function f() {
		require("./loader!");
	}).should.throw();
});
