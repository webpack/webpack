require.ensure(["./a"], function(require) {
	expect(require("./a")).toEqual("a");
})