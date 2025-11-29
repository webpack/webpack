/* webpackNoRename: true */ __webpack_require__.myCustomProperty = "myCustomProperty";

"use strict";
var __webpack_require__ = {};
(() => {
  __webpack_require__.d = (exports1, definition) => {
    for (var key in definition)
      if (
        __webpack_require__.o(definition, key) &&
        !__webpack_require__.o(exports1, key)
      )
        Object.defineProperty(exports1, key, {
          enumerable: true,
          get: definition[key],
        });
  };
})();
(() => {
  __webpack_require__.o = (obj, prop) =>
    Object.prototype.hasOwnProperty.call(obj, prop);
})();
(() => {
  __webpack_require__.r = (exports1) => {
    if ("undefined" != typeof Symbol && Symbol.toStringTag)
      Object.defineProperty(exports1, Symbol.toStringTag, {
        value: "Module",
      });
    Object.defineProperty(exports1, "__esModule", {
      value: true,
    });
  };
})();
var __webpack_exports__ = {};
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  Counter: () => Counter,
});
const jsx_runtime_namespaceObject = require("react/jsx-runtime");
const Counter = () =>
  /*#__PURE__*/ (0, jsx_runtime_namespaceObject.jsx)("div", {
    children: /*#__PURE__*/ (0, jsx_runtime_namespaceObject.jsx)("h1", {
      className: "title",
      children: "React",
    }),
  });
exports.Counter = __webpack_exports__.Counter;
for (var __webpack_i__ in __webpack_exports__)
  if (-1 === ["Counter"].indexOf(__webpack_i__))
    exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, "__esModule", {
  value: true,
});

/* webpackNoRename: true */ __webpack_require__.anotherProperty = "anotherProperty";
