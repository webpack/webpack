function load(exports, require) {
	exports.run = function (render, props) {
		return wrap(render, props);
	};
	exports.again = function (render, props) {
		return wrap(render, props);
	};
	var lib = require("lib");
	var enabled = false;
	function wrap(render, props) {
		if (!enabled) return render(props);
		var loading = props.loading;
		return function () {
			return lib.create(loading);
		};
	}
}
var exportsObject = {};
load(exportsObject, function () {
	return {};
});
console.log(exportsObject.run(function (props) {
	return props.a;
}, { a: 1 }));
