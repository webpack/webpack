it("should have unique ids", function () {
	var ids = [];
	for(var i = 1; i <= 15; i++) {
		var id = require("./files/file" + i + ".js");
		ids.indexOf(id).should.be.eql(-1);
		ids.push(id);
	}
});
