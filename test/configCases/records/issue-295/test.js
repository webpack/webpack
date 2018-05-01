require("./loader!./file");
require("./loader?2!./file");

it("should write relative paths to records", function() {
	var fs = require("fs");
	var path = require("path");
	var content = fs.readFileSync(path.join(__dirname, "records.json"), "utf-8");
	expect(content).not.toMatch(/webpack|issue/);
});
