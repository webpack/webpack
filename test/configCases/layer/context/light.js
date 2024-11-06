require.context('./test1', true, /\.less$/);
require('./test2/shared.less');

it("should contain only white", function() {
	const fs = require("fs");
	const path = require("path");

	const source = fs.readFileSync(path.join(__dirname, "light.css"), "utf-8");

	expect(source.match(/white/g)).toHaveLength(2);
	expect(source).not.toContain("black");
});
