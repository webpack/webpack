// A CommonJS barrel exposing submodules the way webpack's own `lib/index.js`
// does: eager `value` re-exports next to lazy `get` accessors. Consumed below
// through static ESM named imports.
Object.defineProperty(exports, "PluginA", {
	value: require("./PluginA")
});
Object.defineProperty(exports, "lazyValue", {
	enumerable: true,
	get: () => require("./util").value
});
Object.defineProperty(exports, "util", {
	enumerable: true,
	get: () => require("./util")
});
