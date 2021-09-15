let warnings = [];
let oldWarn;

beforeEach(done => {
	oldWarn = console.warn;
	console.warn = m => warnings.push(m);
	done();
});

afterEach(done => {
	expectWarning();
	console.warn = oldWarn;
	done();
});

const expectWarning = regexp => {
	if (!regexp) {
		expect(warnings).toEqual([]);
	} else {
		expect(warnings).toEqual(
			expect.objectContaining({
				0: expect.stringMatching(regexp),
				length: 1
			})
		);
	}
	warnings.length = 0;
};

it("should load the shared modules", async () => {
	__webpack_share_scopes__["test-scope"] = {
		package: {
			"0": {
				get: () => () => "shared package"
			}
		},
		"@scoped/package": {
			"0": {
				get: () => Promise.resolve(() => "shared @scoped/package")
			}
		},
		"prefix/a": {
			"0": {
				get: () => () => "shared prefix/a"
			}
		},
		"prefix/deep/c": {
			"0": {
				get: () => () => "shared prefix/deep/c"
			}
		},
		"./relative1": {
			"0": {
				get: () => () => "shared relative1"
			}
		}
	};
	__webpack_share_scopes__["other-scope"] = {
		"advanced/123": {
			"1.2.beta.1": {
				get: () => () => "123"
			}
		},
		"advanced/error1": {
			"1.2.3": {
				get: () => {
					throw new Error("error1");
				}
			}
		},
		"advanced/error2": {
			"1.2.3": {
				get: () =>
					Promise.resolve().then(() => {
						throw new Error("error2");
					})
			}
		},
		"advanced/error3": {
			"1.2.3": {
				get: () =>
					Promise.resolve().then(() => () => {
						throw new Error("error3");
					})
			}
		},
		"advanced/error4": {
			"1.0.0": {
				get: () => () => "wrong"
			}
		}
	};
	{
		const result = await import("package");
		expect(result.default).toBe("shared package");
	}
	{
		const result = await import("@scoped/package");
		expect(result.default).toBe("shared @scoped/package");
	}
	{
		const result = await import("prefix/a");
		expect(result.default).toBe("shared prefix/a");
	}
	{
		const result = await import("prefix/deep/b");
		expect(result.default).toBe("b");
	}
	{
		const result = await import("prefix/deep/c");
		expect(result.default).toBe("shared prefix/deep/c");
	}
	{
		const result = await import("./relative1");
		expect(result.default).toBe("shared relative1");
	}
	{
		const result = await import("./relative2");
		expect(result.default).toBe("relative2");
	}
	{
		const result = await import("advanced/123");
		expect(result.default).toBe("123");
	}
	{
		await expect(() => import("advanced/error0")).rejects.toEqual(
			expect.objectContaining({
				message: expect.stringContaining("advanced/error0")
			})
		);
	}
	{
		await expect(() => import("advanced/error1")).rejects.toEqual(
			expect.objectContaining({
				message: expect.stringContaining("error1")
			})
		);
	}
	{
		await expect(() => import("advanced/error2")).rejects.toEqual(
			expect.objectContaining({
				message: expect.stringContaining("error2")
			})
		);
	}
	{
		await expect(() => import("advanced/error3")).rejects.toEqual(
			expect.objectContaining({
				message: expect.stringContaining("error3")
			})
		);
	}
	{
		await expect(() => import("advanced/error4")).rejects.toEqual(
			expect.objectContaining({
				message: expect.stringContaining("1.2.3")
			})
		);
	}
});

it("should handle version matching correctly in strict and singleton mode", async () => {
	__webpack_share_scopes__["default"] = {
		strict0: {
			"1.1.1": {
				get: () => () => "shared strict0"
			}
		},
		strict1: {
			"1.1.1": {
				get: () => () => "shared strict1"
			}
		},
		strict2: {
			"1.1.1": {
				get: () => () => "shared strict2"
			}
		},
		strict3: {
			"1.1.1": {
				get: () => () => "shared strict3"
			}
		},
		strict4: {
			"1.1.1": {
				get: () => () => "shared strict4"
			}
		},
		strict5: {
			"1.1.1": {
				get: () => () => "shared strict5"
			}
		},
		singleton: {
			"1.1.1": {
				get: () => () => "shared singleton"
			}
		}
	};
	{
		const result = await import("strict0");
		expect(result.default).toBe("shared strict0");
		expectWarning();
	}
	{
		const result = await import("strict1");
		expect(result.default).toBe("strict");
	}
	{
		const result = await import("strict2");
		expect(result.default).toBe("strict");
	}
	{
		const result = await import("strict3");
		expect(result.default).toBe("strict");
	}
	{
		const result = await import("strict4");
		expect(result.default).toBe("strict");
	}
	{
		await expect(() => import("strict5")).rejects.toEqual(
			expect.objectContaining({
				message: expect.stringContaining("strict5")
			})
		);
		expectWarning();
	}
	{
		const result = await import("singleton");
		expect(result.default).toBe("shared singleton");
		expectWarning(
			/Unsatisfied version 1\.1\.1 of shared singleton module singleton \(required =1\.1\.0\)/
		);
	}
});
