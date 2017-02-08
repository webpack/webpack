it("should append style from LoaderOptionsPlugin and compile css", function() {
	const css = require("./test.css").toString();

	css.should.containEql("body { display: flex;}");
});
