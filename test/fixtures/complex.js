var complex1 = require("./lib/complex1");
require.ensure(["./lib/complex1", "complexm/step2"], function(require) {
	require("./lib/complex1");
	var a = function() {}
	require.ensure(["complexm/step1"], function(require) {
		require("./lib/complex1");
		var s1 = require("complexm/step1");
		var s2 = require("complexm/step2");
		console.log(s1);
		console.log(s2);
	});
});
console.log(complex1);
