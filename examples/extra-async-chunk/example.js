// a chunks with a, b, c
require(["./a", "./b", "./c"]);

// a chunk with a, b, d
require.ensure(["./a"], function(require) {
	require("./b");
	require("./d");
});
