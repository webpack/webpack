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

/***/ "./components/Button.js"
/*!******************************!*\
  !*** ./components/Button.js ***!
  \******************************/
/*! namespace exports */
/*! export default [provided] [used in main] [could be renamed] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/*! Dependency (harmony side effect evaluation) with side effects at 1:0-58 */
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Button)
/* harmony export */ });
/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ "../../node_modules/react/jsx-dev-runtime.js");

const Button = () => {
  return /*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("button", {}, void 0, false);
};


/***/ },

/***/ "./components/Checkbox.js"
/*!********************************!*\
  !*** ./components/Checkbox.js ***!
  \********************************/
/*! namespace exports */
/*! export Checkbox [provided] [used in main] [could be renamed] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/*! Dependency (harmony side effect evaluation) with side effects at 1:0-58 */
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Checkbox: () => (/* binding */ Checkbox)
/* harmony export */ });
/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ "../../node_modules/react/jsx-dev-runtime.js");

const Checkbox = () => {
  return /*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("input", {
    type: "checkbox"
  }, void 0, false);
};


/***/ },

/***/ "./components/Dialog.js"
/*!******************************!*\
  !*** ./components/Dialog.js ***!
  \******************************/
/*! namespace exports */
/*! export default [provided] [used in main] [could be renamed] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/*! Dependency (harmony side effect evaluation) with side effects at 1:0-58 */
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ "../../node_modules/react/jsx-dev-runtime.js");

const Dialog = ({
  children
}) => {
  return /*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("dialog", {
    children: children
  }, void 0, false);
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Dialog);

/***/ },

/***/ "./components/DialogInline.js"
/*!************************************!*\
  !*** ./components/DialogInline.js ***!
  \************************************/
/*! namespace exports */
/*! export DialogInline [provided] [unused] [could be renamed] */
/*! runtime requirements: __webpack_require__ */
/*! Dependency (harmony side effect evaluation) with side effects at 1:0-58 */
(__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) {

/* unused harmony export DialogInline */
/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ "../../node_modules/react/jsx-dev-runtime.js");

const DialogInline = ({
  children
}) => {
  return /*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("dialog", {
    children: children
  }, void 0, false);
};


/***/ },

/***/ "./components/index.js"
/*!*****************************!*\
  !*** ./components/index.js ***!
  \*****************************/
/*! namespace exports */
/*! export Button [provided] [used in main] [could be renamed] -> ./components/Button.js .default */
/*! export Checkbox [provided] [used in main] [could be renamed] -> ./components/Checkbox.js .Checkbox */
/*! export Dialog [provided] [used in main] [could be renamed] -> ./components/Dialog.js .default */
/*! export DialogInline [provided] [unused] [could be renamed] -> ./components/DialogInline.js .DialogInline */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/*! Dependency (harmony side effect evaluation) with side effects at 1:0-45 */
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Button: () => (/* reexport safe */ _Button__WEBPACK_IMPORTED_MODULE_0__["default"]),
/* harmony export */   Checkbox: () => (/* reexport safe */ _Checkbox__WEBPACK_IMPORTED_MODULE_1__.Checkbox),
/* harmony export */   Dialog: () => (/* reexport safe */ _Dialog__WEBPACK_IMPORTED_MODULE_2__["default"])
/* harmony export */ });
/* harmony import */ var _Button__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Button */ "./components/Button.js");
/* harmony import */ var _Checkbox__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Checkbox */ "./components/Checkbox.js");
/* harmony import */ var _Dialog__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Dialog */ "./components/Dialog.js");
/* harmony import */ var _DialogInline__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./DialogInline */ "./components/DialogInline.js");





/***/ },

/***/ "./pages/Dashboard.js"
/*!****************************!*\
  !*** ./pages/Dashboard.js ***!
  \****************************/
/*! namespace exports */
/*! export default [provided] [maybe used in main (runtime-defined)] [usage prevents renaming] */
/*! other exports [not provided] [maybe used in main (runtime-defined)] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/*! Dependency (harmony side effect evaluation) with side effects at 1:0-49 */
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../components */ "./components/index.js");
/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react/jsx-dev-runtime */ "../../node_modules/react/jsx-dev-runtime.js");


const Dashboard = () => {
  return /*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxDEV)(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_1__.Fragment, {
    children: [/*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxDEV)(_components__WEBPACK_IMPORTED_MODULE_0__.Button, {}, void 0, false), /*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxDEV)(_components__WEBPACK_IMPORTED_MODULE_0__.Checkbox, {}, void 0, false)]
  }, void 0, true);
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Dashboard);

/***/ }

}]);
```

# dist/pages_Login_js.output.js

```javascript
"use strict";
(self["webpackChunk"] = self["webpackChunk"] || []).push([["pages_Login_js"],{

/***/ "./components/Button.js"
/*!******************************!*\
  !*** ./components/Button.js ***!
  \******************************/
/*! namespace exports */
/*! export default [provided] [used in main] [could be renamed] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/*! Dependency (harmony side effect evaluation) with side effects at 1:0-58 */
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Button)
/* harmony export */ });
/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ "../../node_modules/react/jsx-dev-runtime.js");

const Button = () => {
  return /*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("button", {}, void 0, false);
};


/***/ },

/***/ "./components/Checkbox.js"
/*!********************************!*\
  !*** ./components/Checkbox.js ***!
  \********************************/
/*! namespace exports */
/*! export Checkbox [provided] [used in main] [could be renamed] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/*! Dependency (harmony side effect evaluation) with side effects at 1:0-58 */
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Checkbox: () => (/* binding */ Checkbox)
/* harmony export */ });
/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ "../../node_modules/react/jsx-dev-runtime.js");

const Checkbox = () => {
  return /*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("input", {
    type: "checkbox"
  }, void 0, false);
};


/***/ },

/***/ "./components/Dialog.js"
/*!******************************!*\
  !*** ./components/Dialog.js ***!
  \******************************/
/*! namespace exports */
/*! export default [provided] [used in main] [could be renamed] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/*! Dependency (harmony side effect evaluation) with side effects at 1:0-58 */
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ "../../node_modules/react/jsx-dev-runtime.js");

const Dialog = ({
  children
}) => {
  return /*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("dialog", {
    children: children
  }, void 0, false);
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Dialog);

/***/ },

/***/ "./components/DialogInline.js"
/*!************************************!*\
  !*** ./components/DialogInline.js ***!
  \************************************/
/*! namespace exports */
/*! export DialogInline [provided] [unused] [could be renamed] */
/*! runtime requirements: __webpack_require__ */
/*! Dependency (harmony side effect evaluation) with side effects at 1:0-58 */
(__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) {

/* unused harmony export DialogInline */
/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ "../../node_modules/react/jsx-dev-runtime.js");

const DialogInline = ({
  children
}) => {
  return /*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("dialog", {
    children: children
  }, void 0, false);
};


/***/ },

/***/ "./components/index.js"
/*!*****************************!*\
  !*** ./components/index.js ***!
  \*****************************/
/*! namespace exports */
/*! export Button [provided] [used in main] [could be renamed] -> ./components/Button.js .default */
/*! export Checkbox [provided] [used in main] [could be renamed] -> ./components/Checkbox.js .Checkbox */
/*! export Dialog [provided] [used in main] [could be renamed] -> ./components/Dialog.js .default */
/*! export DialogInline [provided] [unused] [could be renamed] -> ./components/DialogInline.js .DialogInline */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/*! Dependency (harmony side effect evaluation) with side effects at 1:0-45 */
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Button: () => (/* reexport safe */ _Button__WEBPACK_IMPORTED_MODULE_0__["default"]),
/* harmony export */   Checkbox: () => (/* reexport safe */ _Checkbox__WEBPACK_IMPORTED_MODULE_1__.Checkbox),
/* harmony export */   Dialog: () => (/* reexport safe */ _Dialog__WEBPACK_IMPORTED_MODULE_2__["default"])
/* harmony export */ });
/* harmony import */ var _Button__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Button */ "./components/Button.js");
/* harmony import */ var _Checkbox__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Checkbox */ "./components/Checkbox.js");
/* harmony import */ var _Dialog__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Dialog */ "./components/Dialog.js");
/* harmony import */ var _DialogInline__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./DialogInline */ "./components/DialogInline.js");





/***/ },

/***/ "./pages/Login.js"
/*!************************!*\
  !*** ./pages/Login.js ***!
  \************************/
/*! namespace exports */
/*! export default [provided] [maybe used in main (runtime-defined)] [usage prevents renaming] */
/*! other exports [not provided] [maybe used in main (runtime-defined)] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/*! Dependency (harmony side effect evaluation) with side effects at 1:0-47 */
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../components */ "./components/index.js");
/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react/jsx-dev-runtime */ "../../node_modules/react/jsx-dev-runtime.js");


const Login = () => {
  return /*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxDEV)(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_1__.Fragment, {
    children: [/*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxDEV)(_components__WEBPACK_IMPORTED_MODULE_0__.Button, {}, void 0, false), /*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxDEV)(_components__WEBPACK_IMPORTED_MODULE_0__.Dialog, {}, void 0, false)]
  }, void 0, true);
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Login);

/***/ }

}]);
```

```javascript
/*! For license information please see pages_Login_js.output.js.LICENSE.txt */
"use strict";(self.webpackChunk=self.webpackChunk||[]).push([["pages_Login_js"],{"./components/index.js"(e,s,o){o.d(s,{$n:()=>n,Sc:()=>t,lG:()=>r});var d=o("../../node_modules/react/jsx-dev-runtime.js");const n=()=>(0,d.jsxDEV)("button",{},void 0,!1),t=()=>(0,d.jsxDEV)("input",{type:"checkbox"},void 0,!1),r=({children:e})=>(0,d.jsxDEV)("dialog",{children:e},void 0,!1)},"./pages/Login.js"(e,s,o){o.r(s);var d=o("./components/index.js"),n=o("../../node_modules/react/jsx-dev-runtime.js");o.d(s,["default",0,()=>(0,n.jsxDEV)(n.Fragment,{children:[(0,n.jsxDEV)(d.$n,{},void 0,!1),(0,n.jsxDEV)(d.lG,{},void 0,!1)]},void 0,!0)])},"../../node_modules/react/cjs/react-jsx-dev-runtime.production.js"(e,s){var o=Symbol.for("react.fragment");s.Fragment=o,s.jsxDEV=void 0},"../../node_modules/react/jsx-dev-runtime.js"(e,s,o){e.exports=o("../../node_modules/react/cjs/react-jsx-dev-runtime.production.js")}}]);
```

# Info

## Unoptimized

```
asset vendors-node_modules_react_jsx-dev-runtime_js.output.js 91.2 KiB [emitted] (id hint: vendors)
asset output.js 12.2 KiB [emitted] (name: main)
asset pages_Dashboard_js.output.js 7.42 KiB [emitted]
asset pages_Login_js.output.js 7.4 KiB [emitted]
chunk (runtime: main) output.js (main) 208 bytes (javascript) 6.02 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 6.02 KiB 9 modules
  dependent modules 160 bytes [dependent] 1 module
  ./example.js 48 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
chunk (runtime: main) pages_Dashboard_js.output.js 1.29 KiB [rendered]
  > ./Dashboard ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard
  > ./Dashboard.js ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard.js
  dependent modules 952 bytes [dependent] 5 modules
  ./pages/Dashboard.js 364 bytes [optional] [built] [code generated]
    [exports: default]
    import() context element ./Dashboard ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard
    import() context element ./Dashboard.js ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard.js
chunk (runtime: main) pages_Login_js.output.js 1.27 KiB [rendered]
  > ./Login ./pages/ lazy ^\.\/.*$ namespace object ./Login
  > ./Login.js ./pages/ lazy ^\.\/.*$ namespace object ./Login.js
  dependent modules 952 bytes [dependent] 5 modules
  ./pages/Login.js 352 bytes [optional] [built] [code generated]
    [exports: default]
    import() context element ./Login ./pages/ lazy ^\.\/.*$ namespace object ./Login
    import() context element ./Login.js ./pages/ lazy ^\.\/.*$ namespace object ./Login.js
chunk (runtime: main) vendors-node_modules_react_jsx-dev-runtime_js.output.js (id hint: vendors) 75.5 KiB [rendered] split chunk (cache group: defaultVendors)
  > ./Dashboard ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard
  > ./Dashboard.js ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard.js
  > ./Login ./pages/ lazy ^\.\/.*$ namespace object ./Login
  > ./Login.js ./pages/ lazy ^\.\/.*$ namespace object ./Login.js
  dependent modules 75.3 KiB [dependent] 5 modules
  ../../node_modules/react/jsx-dev-runtime.js 218 bytes [built] [code generated]
    [exports: Fragment, jsxDEV]
    [all exports used]
    from origin ./pages/Dashboard.js 5 reasons
    from origin ./pages/Login.js 5 reasons
    from origin ./components/Button.js
      harmony side effect evaluation react/jsx-dev-runtime ./components/Button.js 1:0-58
      harmony import specifier react/jsx-dev-runtime ./components/Button.js 3:22-29
    from origin ./components/Checkbox.js
      harmony side effect evaluation react/jsx-dev-runtime ./components/Checkbox.js 1:0-58
      harmony import specifier react/jsx-dev-runtime ./components/Checkbox.js 3:22-29
    from origin ./components/Dialog.js
      harmony side effect evaluation react/jsx-dev-runtime ./components/Dialog.js 1:0-58
      harmony import specifier react/jsx-dev-runtime ./components/Dialog.js 5:22-29
    from origin ./components/DialogInline.js
      harmony side effect evaluation react/jsx-dev-runtime ./components/DialogInline.js 1:0-58
      harmony import specifier react/jsx-dev-runtime ./components/DialogInline.js 5:22-29
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 2.73 KiB [emitted] [minimized] (name: main)
asset pages_Dashboard_js.output.js 992 bytes [emitted] [minimized] 1 related asset
asset pages_Login_js.output.js 980 bytes [emitted] [minimized] 1 related asset
chunk (runtime: main) output.js (main) 208 bytes (javascript) 5.9 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.9 KiB 8 modules
  dependent modules 160 bytes [dependent] 1 module
  ./example.js 48 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
chunk (runtime: main) pages_Dashboard_js.output.js 1.88 KiB [rendered]
  > ./Dashboard ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard
  > ./Dashboard.js ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard.js
  dependent modules 1.52 KiB [dependent] 3 modules
  ./pages/Dashboard.js 364 bytes [optional] [built] [code generated]
    [exports: default]
    import() context element ./Dashboard ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard
    import() context element ./Dashboard.js ./pages/ lazy ^\.\/.*$ namespace object ./Dashboard.js
chunk (runtime: main) pages_Login_js.output.js 1.86 KiB [rendered]
  > ./Login ./pages/ lazy ^\.\/.*$ namespace object ./Login
  > ./Login.js ./pages/ lazy ^\.\/.*$ namespace object ./Login.js
  dependent modules 1.52 KiB [dependent] 3 modules
  ./pages/Login.js 352 bytes [optional] [built] [code generated]
    [exports: default]
    import() context element ./Login ./pages/ lazy ^\.\/.*$ namespace object ./Login
    import() context element ./Login.js ./pages/ lazy ^\.\/.*$ namespace object ./Login.js
webpack X.X.X compiled successfully
```
