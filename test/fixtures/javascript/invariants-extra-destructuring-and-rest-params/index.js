const { a = 1, b = 2 } = { b: 7 };

export default [a, b, ((...tail) => tail.length)("x", "y")];
