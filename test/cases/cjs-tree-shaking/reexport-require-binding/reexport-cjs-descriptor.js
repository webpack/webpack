const ns = require("./module?descriptor");
Object.defineProperty(exports, "attributes", {
	value: ns,
	enumerable: true,
	writable: true,
	configurable: true
});
Object.defineProperty(exports, "hidden", { get: () => ns });
Object.defineProperty(exports, "asyncGetter", {
	enumerable: true,
	get: async () => ns
});
Object.defineProperty(exports, "generatorGetter", {
	enumerable: true,
	get: function* () {
		return ns;
	}
});
