it("should run", () => {
	require("./loader-source-root!");
	require("./loader-source-root-slash!");
	require("./loader-source-root-source-slash!");
	require("./loader-source-root-2-slash!");
	require("./loader-no-source-root!");
	require("./loader-pre-relative!");
});

it("should generate the correct SourceMap", function() {
	var fs = require("fs");
	var source = JSON.parse(fs.readFileSync(__filename + ".map", "utf-8"));
	expect(source.sources).toContain("webpack:///./folder/test1.txt");
	expect(source.sources).toContain("webpack:///./folder/test2.txt");
	expect(source.sources).toContain("webpack:///./folder/test3.txt");
	expect(source.sources).toContain("webpack:///./folder/test4.txt");
	expect(source.sources).toContain("webpack:///./folder/test5.txt");
	expect(source.sources).toContain("webpack:///./folder/test6.txt");
});
