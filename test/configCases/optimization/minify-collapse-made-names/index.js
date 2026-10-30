function _typeof(obj) {
	if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
		_typeof = function (obj) {
			return typeof obj;
		};
	} else {
		_typeof = function (obj) {
			return obj && obj.constructor === Symbol ? "symbol" : typeof obj;
		};
	}
	return _typeof(obj);
}

function _extends() {
	_extends =
		Object.assign ||
		function (target) {
			for (var i = 1; i < arguments.length; i++) {
				for (var key in arguments[i]) target[key] = arguments[i][key];
			}
			return target;
		};
	return _extends.apply(this, arguments);
}

it("should move a helper's assignment into its call past a name only the new function declares", () => {
	// Each helper replaces itself on its first call, so print it before.
	expect(_typeof.toString()).toMatchSnapshot();
	expect(_extends.toString()).toMatchSnapshot();
	expect([_typeof(1), _typeof("a"), _typeof(1)]).toEqual([
		"number",
		"string",
		"number"
	]);
	expect(_extends({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
});
