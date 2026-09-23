const ns = require("./module?shadowed");
exports.ns = ns;
Object.defineProperty(exports, "namedGetter", {
	get: function ns() {
		return ns;
	}
});
Object.defineProperty(exports, "paramGetter", {
	get(ns = "param") {
		return ns;
	}
});
