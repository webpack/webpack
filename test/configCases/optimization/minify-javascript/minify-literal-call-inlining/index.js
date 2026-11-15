function rows(count) {
	function label(n) {
		let text = "row";
		if (n > 1) text += "s";
		return text;
	}
	function total(n) {
		let sum = 0;
		for (let i = 1; i <= n; i++) sum += i;
		return sum;
	}
	return () => [count, label(count), { total: total(count) }];
}

function listed() {
	function item() {
		return "item";
	}
	return () => [item, { item }];
}

it("should inline a function called once inside an array or object literal", () => {
	expect(rows(3)()).toEqual([3, "rows", { total: 6 }]);
	expect(rows(1)()).toEqual([1, "row", { total: 1 }]);
});

it("should keep a function an array or object literal holds", () => {
	const [first, { item }] = listed()();
	expect(first).toBe(item);
	expect(first()).toBe("item");
});
