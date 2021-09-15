it("should be main", function () {
	require("./a");
	require("./b");

	expect(window["webpackChunk"].length).toBe(1);
});
