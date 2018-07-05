try {
	require("pkgs/somepackage/foo");
} catch (e) {}

it("should write relative paths to records", function() {
	var fs = require("fs");
	var path = require("path");
	var content = fs.readFileSync(path.join(__dirname, "records.json"), "utf-8");
	expect(content).toMatchSnapshot();
});
