"use strict";
Object.defineProperty(exports, "a", {
	get: function () {
		global.cjsRequireEffects.push("getter-leaf");
		return 1;
	}
});
