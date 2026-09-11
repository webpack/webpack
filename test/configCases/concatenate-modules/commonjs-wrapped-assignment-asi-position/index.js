import wrapped from "wrapped";

const proxied = Symbol.for("proxied");
const getWrapper = (original) => {
	const proxy = function (state, entry) {
		return original.call(this, state, entry);
	};
	proxy[proxied] = true;
	return proxy;
};

for (const format in wrapped.outputs.formats) {
	const original = wrapped.outputs.formats[format]["wrap"];
	if (!original || original[proxied]) {
		continue;
	}
	wrapped.outputs.formats[format]["wrap"] = getWrapper(original);
}

it("should wrap every entry without a syntax error", () => {
	expect(
		Object.values(wrapped.outputs.formats).map(
			(format) => format["wrap"][proxied]
		)
	).toEqual([true, true]);
});
