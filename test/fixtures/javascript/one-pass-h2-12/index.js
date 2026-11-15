Array.prototype["-1"] = 7;
Array.prototype[5] = 8;
String.prototype[3] = 9;
console.log([1, 2][-1], [1, 2][5], [1, , 2][1], "ab"[3], [1, 2][-2]);
