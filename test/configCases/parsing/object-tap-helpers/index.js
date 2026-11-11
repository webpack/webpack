it("should evaluate with the object-form helpers", () => {
	expect(typeof HELPER_FLAG).toBe("string");
	expect(HELPER_ON).toBe(true);
	expect(HELPER_COUNT).toBe(3);
	// a folded condition leaves no reference to the undefined free name
	expect(HELPER_TRUTHY ? "yes" : "no").toBe("yes");
	expect(HELPER_FALSY ? "yes" : "no").toBe("no");
	expect(HELPER_NULLISH ? "yes" : "no").toBe("no");
	expect(typeof HELPER_UNKNOWN).toBe("undefined");
});

it("should replace an unsupported expression and warn", () => {
	expect(HELPER_UNSUPPORTED).toBe(undefined);
});

it("should replace call arguments inside the parentheses", () => {
	expect(String(/* comment */ (1), 2)).toBe("42");
	expect(Number("7")).toBe(7);
});

it("should fold conditions on the evaluated values", () => {
	expect(typeof HELPER_FLAG === "string" ? "folded" : "kept").toBe("folded");
	expect(HELPER_COUNT === 3 ? "folded" : "kept").toBe("folded");
	expect(HELPER_ON ? "folded" : "kept").toBe("folded");
	let member = "kept";
	if (typeof HELPER_OBJECT.member === "number") {
		member = "folded";
	}
	expect(member).toBe("folded");
	let labeled = 0;
	helperLabel: {
		labeled++;
	}
	expect(labeled).toBe(1);
	expect(String /* between */ (1)).toBe("42");
});

it("should follow an approved rename of a free name", () => {
	// the renamed declaration keeps reading the free name at runtime
	global.HELPER_TRUTHY = "runtime";
	const truthy = HELPER_TRUTHY;
	expect(truthy).toBe(true);
});
