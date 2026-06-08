// Mirrors how webpack's own `lib/index.js` exposes submodules: a barrel that
// defines each named export as a non-enumerable `value` re-export.
Object.defineProperty(exports, "PluginA", {
	value: require("./PluginA")
});
Object.defineProperty(exports, "PluginB", {
	value: require("./PluginB")
});
Object.defineProperty(exports, "util", {
	value: require("./util")
});
// Single nested property re-export.
Object.defineProperty(exports, "value", {
	value: require("./util").value
});
