"use strict";
(function () {
	(() => console.log(typeof this))();
	(() => console.log(typeof arguments, arguments.length))();
	(function () {
		(() => console.log(typeof this))();
	})();
	console.log("done");
})();
