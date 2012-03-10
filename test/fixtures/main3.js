var a = require("./a");
require.ensure([], function(require) {
	require("./c.js");
});