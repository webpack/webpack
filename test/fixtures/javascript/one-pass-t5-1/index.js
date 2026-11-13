function make(name) {
	return function (value) {
		console.log(name, typeof value === "object" ? JSON.stringify(value) : value);
		return value;
	};
}
var load = make("load");
function first(require) {
	return (function (module) {
		return module.value + 1;
	})(require({ value: 1 }));
}
console.log(first(load));
function arrow(require) {
	return ((module) => module.value * 2)(require({ value: 2 }));
}
console.log(arrow(load));
function constantAfter(require) {
	return (function (module, extra) {
		return module.value + extra;
	})(require({ value: 3 }), 4);
}
console.log(constantAfter(load));
function laterRuns(require) {
	return (function (module, extra) {
		return module.value + extra;
	})(require({ value: 5 }), require(6));
}
console.log(laterRuns(load));
function readLater(require) {
	return (function (module) {
		return require(7) + module.value;
	})(require({ value: 8 }));
}
console.log(readLater(load));
function statements(require) {
	return (function (module) {
		console.log("runs");
		return module.value;
	})(require({ value: 9 }));
}
console.log(statements(load));
function written(require) {
	var base = 10;
	base++;
	return (function (offset, module) {
		return module.value + offset;
	})(base, require({ value: 11 }));
}
console.log(written(load));
