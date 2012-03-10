require.ensure(["./b"], function(require) {
	window.test(require("./b") === "a", "Duplicate indirect module should work")
})