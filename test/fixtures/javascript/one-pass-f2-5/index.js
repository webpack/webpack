const { a, b = "b", c = 0, d = null, e = function () {} } = {};
const { f = "f" } = [];
const { g = 1 } = function () {};
const { h = 2 } = () => {};
const { i, ...rest } = { x: 1 };
const { j } = { j: 1, k: 2 };
const { kept = "kept", read = "read" } = {};
console.log(read);
