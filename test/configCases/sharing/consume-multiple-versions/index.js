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

it("should be able to consume different shared module version depending on context", async () => {
	__webpack_share_scopes__["default"] = {
		shared: {
			get: () => () => "shared@9.9.9",
			version: [9, 9, 9]
		},
		"shared`1": {
			get: () => () => "shared@1.9.9",
			version: [1, 9, 9]
		},
		"shared`1`2": {
			get: () => () => "shared@1.2.9",
			version: [1, 2, 9]
		},
		"shared`1`2`3": {
			get: () => () => "shared@1.2.3",
			version: [1, 2, 3]
		},
		"shared`2": {
			get: () => () => "shared@2.9.9",
			version: [2, 9, 9]
		},
		"shared`2`3": {
			get: () => () => "shared@2.3.9",
			version: [2, 3, 9]
		},
		"shared`2`3`4": {
			get: () => () => "shared@2.3.4",
			version: [2, 3, 4]
		},
		"shared`3": {
			get: () => () => "shared@3.0.0",
			version: [3, 0, 0]
		},
		shared2: {
			get: () => () => "shared2@9.9.9",
			version: [9, 9, 9]
		}
	};
	expect(require("shared")).toBe("shared@1.9.9");
	expect(require("my-module")).toBe("shared@2.9.9");
	expect(require("my-module2")).toBe("shared@2.3.9");
	expect(() => require("my-module3")).toThrowError(
		"Unsatisfied version of shared module shared@3.0.0 (required shared@3.4.5)"
	);
	expect(require("my-module4")).toBe("shared@9.9.9");
	expect(require("shared2")).toBe("shared2@9.9.9");
});
