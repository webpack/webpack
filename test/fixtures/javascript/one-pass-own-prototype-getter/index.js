var hits = 0;
var proto = Function.prototype;
Object.defineProperty(proto, "prototype", {
	configurable: true,
	get: function () {
		hits++;
	}
});
(function () {}).prototype;
(function* () {}).prototype;
(class {}).prototype;
(async function () {}).prototype;
(() => {}).prototype;
delete proto.prototype;
console.log(hits);
