webpackJsonp([0],[
/* 0 */
/* no static exports found */
/* all exports used */
/*!**************************************************!*\
  !*** (webpack)/~/coffee-loader!./example.coffee ***!
  \**************************************************/
/***/ (function(module, exports) {

var math, race,
  slice = [].slice;

math = {
  root: Math.sqrt,
  square: square,
  cube: function(x) {
    return x * square(x);
  }
};

race = function() {
  var runners, winner;
  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  return print(winner, runners);
};


/***/ })
],[0]);
//# sourceMappingURL=bundle-cheap-source-map.js.map