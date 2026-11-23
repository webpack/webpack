// A constant array's `length` folds where its indexes do.
var pair = [1, 2];
console.log(pair[0], pair.length);
let triple = ["a", "b", "c"];
console.log(triple.length + triple[0]);
var holed = [1, , 3];
console.log(holed[0], holed.length);
var spread = [1, ...holed];
console.log(spread[0], spread.length);
var grown = [1, 2];
grown.push(3);
console.log(grown[0], grown.length);
var cut = [1, 2];
cut.length = 1;
console.log(cut[0], cut.length);
var nested = [[1, 2], 3];
console.log(nested[1], nested[0].length);
var maybe = [1, 2];
console.log(maybe[0], maybe?.length);
