var hits = 0;
Object.defineProperty(Function.prototype, "x", {
	configurable: true,
	get: function () {
		hits++;
		return function () {
			hits += 10;
		};
	}
});
(function () {})?.x;
(function () {}).x?.();
(() => 1)?.x;
(class {})?.x;
({
	get y() {
		hits += 100;
	}
})?.y;
null?.x;
(void 0)?.x;
console.log(hits);
delete Function.prototype.x;
