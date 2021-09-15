function loadDependency(dep) {
	require("./dependencies/" + dep);
}

it("should write relative dynamic-require paths to records", function() {
	var fs = require("fs");
	var path = require("path");
	var content = fs.readFileSync(path.join(__dirname, "records.json"), "utf-8");
	expect(content).toMatchSnapshot();
});
