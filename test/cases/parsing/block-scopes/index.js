import ok from "./module";

// This should not leak an "ok" declaration into this scope
export default (function ok() {});

it("should allow block scopes", () => {
	expect(ok).toBe("ok");
	if (true) {
		const ok = "no";
		expect(ok).toBe("no");
	}
	expect(ok).toBe("ok");
	{
		let ok = "no";
		expect(ok).toBe("no");
	}
	expect(ok).toBe("ok");
	{
		class ok {}
		expect(new ok()).toBeInstanceOf(ok);
	}
	expect(ok).toBe("ok");
	for (let ok = "no", once = true; once; once = !once) {
		expect(ok).toBe("no");
	}
	expect(ok).toBe("ok");
	for (const ok of ["no"]) {
		expect(ok).toBe("no");
	}
	expect(ok).toBe("ok");
	for (const ok in { no: 1 }) {
		expect(ok).toBe("no");
	}
	expect(ok).toBe("ok");
	try {
		throw "no";
	} catch (ok) {
		expect(ok).toBe("no");
	}
	expect(ok).toBe("ok");
});

it("should allow function scopes in block scopes", () => {
	let f;
	{
		f = () => {
			expect(ok).toBe("no");
		};
		const ok = "no";
	}
	f();
});

it("should not block scope vars (for)", () => {
	expect(ok).toBe(undefined);
	for (var ok = "no", once = true; once; once = !once) {
		expect(ok).toBe("no");
	}
	expect(ok).toBe("no");
});

it("should not block scope vars (for-of)", () => {
	expect(ok).toBe(undefined);
	for (var ok of ["no"]) {
		expect(ok).toBe("no");
	}
	expect(ok).toBe("no");
});

it("should not block scope vars (for-in)", () => {
	expect(ok).toBe(undefined);
	for (var ok in { no: 1 }) {
		expect(ok).toBe("no");
	}
	expect(ok).toBe("no");
});
