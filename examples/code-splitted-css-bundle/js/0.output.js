webpackJsonp([0],[
/* 0 */,
/* 1 */
/* no static exports found */
/* all exports used */
/*!******************!*\
  !*** ./chunk.js ***!
  \******************/
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(/*! ./style2.css */ 6);


/***/ }),
/* 2 */,
/* 3 */,
/* 4 */,
/* 5 */
/* no static exports found */
/* all exports used */
/*!*******************************************!*\
  !*** (webpack)/~/css-loader!./style2.css ***!
  \*******************************************/
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(/*! ../../~/css-loader/lib/css-base.js */ 3)();
// imports


// module
exports.push([module.i, ".xyz {\n\tbackground: url(" + __webpack_require__(/*! ./image2.png */ 7) + ");\n}\n", ""]);

// exports


/***/ }),
/* 6 */
/* no static exports found */
/* all exports used */
/*!********************!*\
  !*** ./style2.css ***!
  \********************/
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(/*! !../../~/css-loader!./style2.css */ 5);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(/*! ../../~/style-loader/addStyles.js */ 4)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../node_modules/css-loader/index.js!./style2.css", function() {
			var newContent = require("!!../../node_modules/css-loader/index.js!./style2.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 7 */
/* no static exports found */
/* all exports used */
/*!********************!*\
  !*** ./image2.png ***!
  \********************/
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__.p + "ce21cbdd9b894e6af794813eb3fdaf60.png";

/***/ })
]);