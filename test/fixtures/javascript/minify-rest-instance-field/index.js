// A rest parameter passed nothing is read whole as `[]` only where that read
// runs once: an instance field runs once for each instance, so each would get
// its own array, while a static field runs once and may.
var Instance = (function (...rest) {
	return class {
		value = rest;
	};
})();
console.log(new Instance().value === new Instance().value);

var Static = (function (...rest) {
	return class {
		static value = rest;
	};
})();
console.log(Static.value === Static.value);
