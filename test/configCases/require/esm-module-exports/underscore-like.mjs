// Underscore-shaped ESM-only library that exposes itself both as the ESM
// `default` and as the `"module.exports"` named export — the convention
// the issue #20896 (and its links to underscore/issues/3016 and
// esbuild/issues/4459) is about. The implementation here is intentionally
// trivial; the point of the fixture is the *shape* of the exports, not the
// behavior of any one method.
function _(obj) {
	return new _.wrapper(obj);
}
_.wrapper = function wrapper(v) {
	this.v = v;
};

_.partial = function partial(fn, ...preset) {
	const placeholder = _.partial.placeholder;
	return (...args) => {
		const merged = preset.map((p) => (p === placeholder ? args.shift() : p));
		return fn(...merged, ...args);
	};
};
// Default partial-application placeholder: the library function itself.
// underscore/issues/3016 traced a regression to this identity being broken
// when bundlers turned `_` into an ESM namespace object.
_.partial.placeholder = _;

_.map = (arr, fn) => arr.map(fn);
_.identity = (x) => x;
_.VERSION = "1.0.0-esm";

export default _;
export { _ as "module.exports" };
