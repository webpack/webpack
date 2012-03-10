require.ensure(["./acircular2"], function(require) {
	require("./acircular2")
	window.test(true, "Circular async loading 1")
})