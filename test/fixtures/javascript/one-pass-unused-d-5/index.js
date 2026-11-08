/* @__PURE__ */ (() => x)(y, z);
a();
/* @__PURE__ */ (function () { return x; })(y(), z);
/* @__PURE__ */ g()(y);
(function () { g(); })();
