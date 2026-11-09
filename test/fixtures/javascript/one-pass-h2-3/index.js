function g() { return 1; }
var f = console.log;
f([][-1], [1, 2, 3]["-1"], "abc"["01"], [1]["1.5"], ["a", "b"]["1"], "abc"[-Infinity]);
f([g(), 1]["01"], "ab".x, [1, 2].foo, [1, 2][NaN], [1, 2]["length"]);
