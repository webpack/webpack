webpackJsonp([3,1],[
/* 0 */,
/* 1 */
/* no static exports found */
/* all exports used */
/*!******************!*\
  !*** ./aPage.js ***!
  \******************/
/***/ (function(module, exports) {

module.exports = function() {
	return "This is page A.";
};

/***/ }),
/* 2 */,
/* 3 */,
/* 4 */
/* no static exports found */
/* all exports used */
/*!*******************!*\
  !*** ./aEntry.js ***!
  \*******************/
/***/ (function(module, exports, __webpack_require__) {

// Just show the page "a"
var render = __webpack_require__(/*! ./render */ 0);
render(__webpack_require__(/*! ./aPage */ 1));

/***/ })
],[4]);