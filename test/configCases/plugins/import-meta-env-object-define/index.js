it("should expose all definitions via direct property access", () => {
	expect(import.meta.env.A).toBe("a");
	expect(import.meta.env.B).toBe("b");
	expect(import.meta.env.ENV_C).toBe("c");
	expect(import.meta.env.NESTED.X).toBe("x");
	expect(import.meta.env.LIST).toEqual(["l1", "l2"]);
});

it("should support runtime values in every access pattern", () => {
	expect(import.meta.env.RUNTIME).toBe("env-rv");
	const env = import.meta.env;
	expect(env.RUNTIME).toBe("env-rv");
	const { RUNTIME } = import.meta.env;
	expect(RUNTIME).toBe("env-rv");
});

it("should expose all definitions when reading the whole object", () => {
	const env = import.meta.env;
	expect(env.A).toBe("a");
	expect(env.B).toBe("b");
	expect(env.ENV_C).toBe("c");
	expect(env.NESTED.X).toBe("x");
	expect(env.LIST).toEqual(["l1", "l2"]);
});

it("should expose all definitions when destructuring", () => {
	const { A, B, ENV_C, NESTED } = import.meta.env;
	expect(A).toBe("a");
	expect(B).toBe("b");
	expect(ENV_C).toBe("c");
	expect(NESTED.X).toBe("x");
});

it("should expose all definitions when destructuring with rest", () => {
	const { A, ...rest } = import.meta.env;
	expect(A).toBe("a");
	expect(rest.B).toBe("b");
	expect(rest.ENV_C).toBe("c");
});

it("should expose all definitions when destructuring import.meta", () => {
	const { env } = import.meta;
	expect(env.A).toBe("a");
	expect(env.B).toBe("b");
	expect(env.ENV_C).toBe("c");
});

it("should expose all definitions on the import.meta object", () => {
	const meta = import.meta;
	expect(meta.env.A).toBe("a");
	expect(meta.env.B).toBe("b");
	expect(meta.env.ENV_C).toBe("c");
});

it("should keep unknown properties undefined in every access pattern", () => {
	expect(import.meta.env.NOT_EXIST).toBeUndefined();
	const env = import.meta.env;
	expect(env.NOT_EXIST).toBeUndefined();
	const { NOT_EXIST } = import.meta.env;
	expect(NOT_EXIST).toBeUndefined();
});

it("should keep a `__proto__` definition an own property", () => {
	const env = import.meta.env;
	expect(Object.keys(env)).toContain("__proto__");
	expect(env["__proto__"]).toBe("proto-value");
	expect(Object.getPrototypeOf(env)).toBe(Object.prototype);
});

it("should support runtime globals in definition values", () => {
	// reading __webpack_public_path__ ensures the publicPath runtime is included
	expect(__webpack_public_path__).toBe("/assets/");
	const env = import.meta.env;
	expect(env.BASE_URL).toBe("/assets/");
	expect(import.meta.env.BASE_URL).toBe("/assets/");
});

function donotcallme() {
	expect("asi unsafe call happened").toBe(false);
}

it("should support statement-position reads and be ASI safe", () => {
	import.meta.env;
	(donotcallme)
	import.meta.env;
	expect(typeof import.meta.env).toBe("object");
});
