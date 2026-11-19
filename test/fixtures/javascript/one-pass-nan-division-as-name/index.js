// `0/0` prints as the global `NaN` it folds to, as long.
var a;
console.log(delete (a = NaN));
console.log(delete (a = 0 / 0));
console.log(0 / 0, NaN, typeof (0 / 0), 0 / 0 + "");
var o = { NaN: 1 };
console.log(o[0 / 0]);
