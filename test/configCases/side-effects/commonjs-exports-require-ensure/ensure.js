require.ensure([], function (require) {
	require("./pure");
	global.requireEnsureCallbackRan = true;
});
