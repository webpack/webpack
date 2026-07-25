// webpack emits `const __webpack_require__ = {}` for its require scope when
// the output environment allows ES6, so a nested bundle uses `const`, not `var`
const __webpack_require__ = { foo: 42 };
const __webpack_exports__ = { foo: 42 };

export { __webpack_require__ as constRequire, __webpack_exports__ as constExports };
