function donotcallme() {
	expect("asi unsafe call happened").toBe(false);
}

it("should merge dotted definitions into whole-object reads", () => {
	const obj = OBJECT;
	expect(obj.A).toBe("a");
	expect(obj.B).toBe("b");
	expect(obj.NESTED.D1).toBe("d1");
	expect(obj.NESTED.DEEP).toBe("deep");
	expect(obj.LIST).toEqual(["l1"]);
});

it("should support runtime values in whole-object reads", () => {
	const obj = OBJECT;
	expect(obj.RUNTIME).toBe("rv");
	expect(OBJECT.RUNTIME).toBe("rv");
});

it("should merge dotted definitions into destructured reads", () => {
	const { A, B, NESTED } = OBJECT;
	expect(A).toBe("a");
	expect(B).toBe("b");
	expect(NESTED.DEEP).toBe("deep");
});

it("should keep direct access consistent with object reads", () => {
	expect(OBJECT.A).toBe("a");
	expect(OBJECT.B).toBe("b");
	expect(OBJECT.NESTED.D1).toBe("d1");
	expect(OBJECT.NESTED.DEEP).toBe("deep");
	expect(OBJECT.A.length).toBe(1);
});

it("should read nested objects built from dotted keys", () => {
	const nested = OBJECT.NESTED;
	expect(nested.D1).toBe("d1");
	expect(nested.DEEP).toBe("deep");
	const { DEEP } = OBJECT.NESTED;
	expect(DEEP).toBe("deep");
});

it("should keep unknown properties undefined and inherited members working", () => {
	expect(OBJECT.MISSING).toBeUndefined();
	expect(OBJECT.NESTED.MISSING).toBeUndefined();
	expect(OBJECT.LIST.MISSING).toBeUndefined();
	expect(OBJECT.LIST.length).toBe(1);
	expect(OBJECT.LIST.EXTRA).toBe("extra");
	const ts = OBJECT.toString;
	expect(typeof ts).toBe("function");
	const { NOPE } = OBJECT;
	expect(NOPE).toBeUndefined();
});

it("should merge object values into nested views from dotted keys", () => {
	const sub = MERGE.SUB;
	expect(sub.A).toBe("ma");
	expect(sub.B).toBe("mb");
	expect(MERGE.SUB.A).toBe("ma");
	expect(MERGE.SUB.B).toBe("mb");
});

it("should keep scalar definitions with dotted sub keys working", () => {
	expect(SCALAR).toBe("scalar");
	expect(SCALAR.X).toBe("scalar-x");
});

it("should support destructuring dotted definitions across plugin instances", () => {
	const { X, Y } = CROSS;
	expect(X).toBe("x");
	expect(Y).toBe("y");
});

it("should merge process.env definitions from every plugin", () => {
	const env = process.env;
	expect(env.PE_A).toBe("pe-a");
	expect(env.PE_B).toBe("pe-b");
	const { PE_A, PE_B } = process.env;
	expect(PE_A).toBe("pe-a");
	expect(PE_B).toBe("pe-b");
	expect(process.env.PE_A).toBe("pe-a");
	expect(process.env.PE_B).toBe("pe-b");
});

it("should be ASI safe", () => {
	(donotcallme)
	OBJECT;
	expect(OBJECT.A).toBe("a");
});
