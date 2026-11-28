// TypeScript's `?.` for ES2019, `(_a=x)===null||_a===void 0?void 0:_a.y`,
// is `x?.y` where nothing else reads `_a`.
function read(source) {
	var _a;
	return (_a = source.inner) === null || _a === void 0 ? void 0 : _a.value;
}
function called(source) {
	var _a;
	return (_a = source.make()) === null || _a === void 0
		? void 0
		: _a.call(source);
}
function loose(source) {
	var _a;
	return (_a = source.inner) != null ? _a.value : undefined;
}
function argument(source) {
	var _a;
	console.log("argument", (_a = source.inner) == null ? void 0 : _a.value);
}
// Read again, or called as a member, the name stays.
function again(source) {
	var _a;
	var value = (_a = source.inner) == null ? void 0 : _a.value;
	return [value, _a];
}
function method(source) {
	var _a;
	return (_a = source.method) == null ? void 0 : _a();
}
var full = {
	inner: { value: 1 },
	make() {
		return function () {
			return this === full;
		};
	},
	method() {
		return this;
	}
};
var empty = { inner: null, make: () => undefined, method: undefined };
for (const source of [full, empty]) {
	argument(source);
	console.log(read(source), called(source), loose(source));
	console.log(again(source), method(source) === full);
}
