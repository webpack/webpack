# example.js

```javascript
// insert router here
import(`./pages/${page}`);
```

# pages/Dashboard.js

```javascript
import { Button, Checkbox } from "../components";

const Dashboard = () => {
	return (
		<>
			<Button />
			<Checkbox />
		</>
	);
};
export default Dashboard;
```

# pages/Login.js

```javascript
import { Button, Dialog } from "../components";

const Login = () => {
	return (
		<>
			<Button />
			<Dialog />
		</>
	);
};
export default Login;
```

# components/index.js

```javascript
export { default as Button } from "./Button";
export * from "./Checkbox";
export { default as Dialog } from "./Dialog";
export { DialogInline } from "./DialogInline";
```

# dist/pages_Dashboard_js.output.js

```javascript
"use strict";
(self["webpackChunk"] = self["webpackChunk"] || []).push([["pages_Dashboard_js"],{

/***/ "./components/Button.js":
/*!******************************!*\
  !*** ./components/Button.js ***!
  \******************************/
/*! namespace exports */
/*! export default [provided] [used in main] [could be renamed] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Button)
/* harmony export */ });
const Button = () => {
  return /*#__PURE__*/React.createElement("button", null);
};



/***/ }),

/***/ "./components/Checkbox.js":
/*!********************************!*\
  !*** ./components/Checkbox.js ***!
  \********************************/
/*! namespace exports */
/*! export Checkbox [provided] [used in main] [could be renamed] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Checkbox": () => (/* binding */ Checkbox)
/* harmony export */ });
const Checkbox = () => {
  return /*#__PURE__*/React.createElement("input", {
    type: "checkbox"
  });
};



/***/ }),

/***/ "./pages/Dashboard.js":
/*!****************************!*\
  !*** ./pages/Dashboard.js ***!
  \****************************/
/*! namespace exports */
/*! export default [provided] [maybe used in main (runtime-defined)] [usage prevents renaming] */
/*! other exports [not provided] [maybe used in main (runtime-defined)] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../components */ "./components/Button.js");
/* harmony import */ var _components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../components */ "./components/Checkbox.js");


const Dashboard = () => {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(_components__WEBPACK_IMPORTED_MODULE_0__.default, null), /*#__PURE__*/React.createElement(_components__WEBPACK_IMPORTED_MODULE_1__.Checkbox, null));
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Dashboard);

/***/ })

}]);
```

# dist/pages_Login_js.output.js

```javascript
"use strict";
(self["webpackChunk"] = self["webpackChunk"] || []).push([["pages_Login_js"],{

/***/ "./components/Button.js":
/*!******************************!*\
  !*** ./components/Button.js ***!
  \******************************/
/*! namespace exports */
/*! export default [provided] [used in main] [could be renamed] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Button)
/* harmony export */ });
const Button = () => {
  return /*#__PURE__*/React.createElement("button", null);
};



/***/ }),

/***/ "./components/Dialog.js":
/*!******************************!*\
  !*** ./components/Dialog.js ***!
  \******************************/
/*! namespace exports */
/*! export default [provided] [used in main] [could be renamed] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const Dialog = ({
  children
}) => {
  return /*#__PURE__*/React.createElement("dialog", null, children);
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Dialog);

/***/ }),

/***/ "./pages/Login.js":
/*!************************!*\
  !*** ./pages/Login.js ***!
  \************************/
/*! namespace exports */
/*! export default [provided] [maybe used in main (runtime-defined)] [usage prevents renaming] */
/*! other exports [not provided] [maybe used in main (runtime-defined)] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../components */ "./components/Button.js");
/* harmony import */ var _components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../components */ "./components/Dialog.js");


const Login = () => {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(_components__WEBPACK_IMPORTED_MODULE_0__.default, null), /*#__PURE__*/React.createElement(_components__WEBPACK_IMPORTED_MODULE_1__.default, null));
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Login);

/***/ })

}]);
```

```javascript
"use strict";(self.webpackChunk=self.webpackChunk||[]).push([["pages_Login_js"],{"./components/Button.js":(e,t,n)=>{n.d(t,{Z:()=>c});const c=()=>React.createElement("button",null)},"./pages/Login.js":(e,t,n)=>{n.r(t),n.d(t,{default:()=>a});const c=({children:e})=>React.createElement("dialog",null,e);var l=n("./components/Button.js");const a=()=>React.createElement(React.Fragment,null,React.createElement(l.Z,null),React.createElement(c,null))}}]);
```

# Info

## Unoptimized

```
asset output.js 11.1 KiB [emitted] (name: main)
asset pages_Login_js.output.js 2.82 KiB [emitted]
asset pages_Dashboard_js.output.js 2.78 KiB [emitted]
chunk (runtime: main) output.js (main) 208 bytes (javascript) 5.55 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.55 KiB 8 modules
  dependent modules 160 bytes [dependent] 1 module
  ./example.js 48 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
chunk (runtime: main) pages_Dashboard_js.output.js 513 bytes [rendered]
  > ./Dashboard ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard
  > ./Dashboard.js ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard.js
  dependent modules 244 bytes [dependent] 2 modules
  ./pages/Dashboard.js 269 bytes [optional] [built] [code generated]
    [exports: default]
    import() context element ./Dashboard ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard
    import() context element ./Dashboard.js ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard.js
chunk (runtime: main) pages_Login_js.output.js 504 bytes [rendered]
  > ./Login ./pages/ lazy ^\.\/.*$ namespace object ./Login
  > ./Login.js ./pages/ lazy ^\.\/.*$ namespace object ./Login.js
  dependent modules 247 bytes [dependent] 2 modules
  ./pages/Login.js 257 bytes [optional] [built] [code generated]
    [exports: default]
    import() context element ./Login ./pages/ lazy ^\.\/.*$ namespace object ./Login
    import() context element ./Login.js ./pages/ lazy ^\.\/.*$ namespace object ./Login.js
webpack 5.51.1 compiled successfully
```

## Production mode

```
asset output.js 2.49 KiB [emitted] [minimized] (name: main)
asset pages_Dashboard_js.output.js 456 bytes [emitted] [minimized]
asset pages_Login_js.output.js 450 bytes [emitted] [minimized]
chunk (runtime: main) output.js (main) 208 bytes (javascript) 5.55 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.55 KiB 8 modules
  dependent modules 160 bytes [dependent] 1 module
  ./example.js 48 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
chunk (runtime: main) pages_Dashboard_js.output.js 513 bytes [rendered]
  > ./Dashboard ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard
  > ./Dashboard.js ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard.js
  dependent modules 115 bytes [dependent] 1 module
  ./pages/Dashboard.js + 1 modules 398 bytes [optional] [built] [code generated]
    [exports: default]
    import() context element ./Dashboard ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard
    import() context element ./Dashboard.js ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard.js
chunk (runtime: main) pages_Login_js.output.js 504 bytes [rendered]
  > ./Login ./pages/ lazy ^\.\/.*$ namespace object ./Login
  > ./Login.js ./pages/ lazy ^\.\/.*$ namespace object ./Login.js
  dependent modules 115 bytes [dependent] 1 module
  ./pages/Login.js + 1 modules 389 bytes [optional] [built] [code generated]
    [exports: default]
    import() context element ./Login ./pages/ lazy ^\.\/.*$ namespace object ./Login
    import() context element ./Login.js ./pages/ lazy ^\.\/.*$ namespace object ./Login.js
webpack 5.51.1 compiled successfully
```
