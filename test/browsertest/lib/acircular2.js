require.ensure(["./acircular"], function(require) {
	require("./acircular")
	window.test(true, "Circular async loading 2")
})