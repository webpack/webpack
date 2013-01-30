require.ensure(["./a"], function(require) {
	require("./b");
});