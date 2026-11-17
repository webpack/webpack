// A write to a value made where it is written, which nothing else reads,
// runs only what it writes.
var log = [];
function Simulator() {
	/abc/.index = 1, (this.parts = []);
}
console.log(new Simulator().parts.length);
(function () {}).prototype.destroy = log.push("prototype");
[1][0] = log.push("element");
console.log(log.join());
// A write a getter, a strict primitive or the chain may answer stays.
try {
	(function () {
		"use strict";
		"abc".b = "g";
	})();
} catch (error) {
	console.log(error instanceof TypeError);
}
try {
	(function () {
		"use strict";
		/a/.source = "b";
	})();
} catch (error) {
	console.log(error instanceof TypeError);
}
try {
	[].length = -1;
} catch (error) {
	console.log(error instanceof RangeError);
}
var proto = {};
({}).__proto__ = proto;
console.log(typeof proto);
