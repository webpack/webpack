console.log("entry-2.js");

require.ensure([], function() {
	require("./a");
	require("./vendor");
}, 'entry-2-a-async');

require.ensure([], function() {
	require("./b");
	require("./commons");
}, 'entry-2-b-async');
