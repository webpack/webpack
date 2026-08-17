export function weak() {
	// A weak dependency: it asks whether the module is in the bundle without
	// ever evaluating it.
	return __webpack_is_included__("./index.js");
}
