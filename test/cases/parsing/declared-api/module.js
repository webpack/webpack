define("local", () => {
	var __webpack_modules__ = 42;

	return __webpack_modules__;
});

define(["local"], l => {
	var __webpack_modules__ = 42 + l;

	return __webpack_modules__;
});
