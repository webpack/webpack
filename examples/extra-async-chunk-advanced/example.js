require(["./a", "./b", "./c"], function(a, b, c) {});

require.ensure(["./a"], function(require) {
	require("./b");
	require("./d");
});

require.ensure(["./a", "./e"], function(require) {
	require("./a");
	require.ensure(["./b"], function(require) {
		require("./f");
	});
	require.ensure(["./b"], function(require) {
		require("./g");
	});
});
