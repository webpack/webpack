it("should return the content processed by css-loader instead of asset/resource", function () {
	var a1 = require("./index.css");
	expect(a1).toEqual("__css__");
});
