var calls = 0;
function run() {
	calls++;
}
var object = { key: 1 };
console.log(delete (run(), undefined));
console.log(delete (run(), void 0));
console.log(delete (run(), Infinity));
console.log(delete (run(), NaN));
console.log(delete (run(), 1 / 0));
console.log(delete (run(), object.key), object.key);
console.log(delete (1, undefined), calls);
