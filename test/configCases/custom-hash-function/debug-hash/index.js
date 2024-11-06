it("debug hash should works", function () {
	var ids = [];
	for(var i = 1; i <= 15; i++) {
		var id = require("./files/file" + i + ".js");
		expect(ids.indexOf(id)).toBe(-1);
		ids.push(id);
	}
});
