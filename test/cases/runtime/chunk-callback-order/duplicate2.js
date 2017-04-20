require.ensure(["./b"], function(require) {
	expect(require("./b")).toEqual("a");
})