console.log("entry-1.js");

require.ensure([], function() {
	require("./a");
	require("./vendor");
}, 'entry-1-a-async');

require.ensure([], function() {
	require("./b");
	require("./commons");
}, 'entry-1-b-async');
