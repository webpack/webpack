function nullish() {
	var Size;
	(function (Size) {
		Size.Large = 2;
	})(Size ?? (Size = {}));
	return Size;
}

function fields() {
	var made;
	var Made = class {
		value = made || (made = {});
	};
	return new Made().value === new Made().value;
}

it("should fold a `var` guarded by `??` before anything writes it", () => {
	expect(nullish()).toEqual({ Large: 2 });
});

it("should keep a guard in a field's value, which runs for each instance", () => {
	expect(fields()).toBe(true);
});
