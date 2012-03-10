require.ensure(["./a"], function(require) {
	window.test(require("./a") === "a", "Duplicate module should work")
})