// Shaped like another webpack bundle's ESM output: the chunk bootstrap declares
// these same names, so without renaming both land in one scope — `const` fails
// to parse and `var` silently clobbers the table.
var __webpack_modules__ = ({
	940: ((module, exports) => {
		exports.value = 42;
	})
});
const __webpack_module_cache__ = {};
function __webpack_require__(moduleId) {
	const cachedModule = __webpack_module_cache__[moduleId];
	if (cachedModule !== undefined) return cachedModule.exports;
	const module = (__webpack_module_cache__[moduleId] = { exports: {} });
	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
	return module.exports;
}
__webpack_require__.m = __webpack_modules__;

export const moduleIds = Object.keys(__webpack_modules__);
export default __webpack_require__(940).value;
