var a = require("./a");
with(x) {
	switch(a) {
	case 1:
		require("./b");
	default: 
		require.ensure(["m1/a"], function() {
			var a = require("m1/a"),
				b = require("m1/b");
		});
	}
}