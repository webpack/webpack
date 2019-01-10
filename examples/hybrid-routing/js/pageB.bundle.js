webpackJsonp([2,0],{

/***/ 2:
/* no static exports found */
/* all exports used */
/*!******************!*\
  !*** ./bPage.js ***!
  \******************/
/***/ (function(module, exports) {

module.exports = function() {
	return "This is page B.";
};

/***/ }),

/***/ 5:
/* no static exports found */
/* all exports used */
/*!*******************!*\
  !*** ./bEntry.js ***!
  \*******************/
/***/ (function(module, exports, __webpack_require__) {

// Just show the page "b"
var render = __webpack_require__(/*! ./render */ 0);
render(__webpack_require__(/*! ./bPage */ 2));

/***/ })

},[5]);