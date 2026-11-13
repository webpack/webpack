function make(name) {
	return function (value) {
		console.log(name, typeof value === "object" ? JSON.stringify(value) : value);
		return value;
	};
}
var load = make("load");
function interop(require) {
	var _react = _interopRequireDefault(require({ __esModule: true, default: "react" }));
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	return [_react.default, _react.default];
}
console.log(interop(load));
function shared(require) {
	var a = (function (obj) {
			return obj && obj.x ? obj : { x: obj };
		})(require({ x: 1 })),
		b = (function (obj) {
			return obj.y, obj;
		})(require({ y: 2 }));
	return [a.x, a.x, b.y, b.y];
}
console.log(shared(load));
function lexical(require) {
	let a = ((o) => o.x + o.x)(require({ x: 3 }));
	console.log(a, a);
	{
		const b = (function (o) {
			return o.y * o.y;
		})(require({ y: 4 }));
		console.log(b, b);
	}
}
lexical(load);
function written(require, value) {
	value = require(value);
	var a = (function (o) {
		return o - o;
	})(value);
	return [a, a];
}
console.log(written(load, 5));
function collides(require) {
	var o = require(1);
	var a = (function (o) {
		return o / o;
	})(require(2));
	return [a, a, o];
}
console.log(collides(load));
function collapsed(require) {
	var a = (function (o) {
		return o + 1 + o;
	})(require(7));
	return a;
}
console.log(collapsed(load));
function repeated(require) {
	var a = (function (o) {
			return o + 2 + o;
		})(require(8)),
		b = (function (o) {
			return o + 2 + o;
		})(require(9)),
		c;
	return [a, a, b, b, c];
}
console.log(repeated(load));
function twoArguments(require) {
	var a = (function (o) {
		return o + 3 + o;
	})(require(10), 1);
	return [a, a];
}
console.log(twoArguments(load));
