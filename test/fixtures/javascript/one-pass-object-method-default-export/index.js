// A named function a default-exported call returns stays an expression.
export const saved = 1;
const o = { p: function () { return function saved() { return saved; }; } };
export default o.p();
