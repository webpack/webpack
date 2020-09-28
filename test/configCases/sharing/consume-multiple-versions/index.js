const expectWarning = require("../../../helpers/expectWarningFactory")();

it("should be able to consume different shared module version depending on context", async () => {
	__webpack_share_scopes__["default"] = {
		shared: {
			"9.9.9": {
				get: () => () => "shared@9.9.9"
			},
			"1.9.9": {
				get: () => () => "shared@1.9.9"
			},
			"1.2.9": {
				get: () => () => "shared@1.2.9"
			},
			"1.2.3": {
				get: () => () => "shared@1.2.3",
				from: "mfe1"
			},
			"2.9.9": {
				get: () => () => "shared@2.9.9"
			},
			"2.3.9": {
				get: () => () => "shared@2.3.9"
			},
			"2.3.4": {
				get: () => () => "shared@2.3.4"
			},
			"3.0.0": {
				get: () => () => "shared@3.0.0"
			}
		},
		shared2: {
			"9.9.9": {
				get: () => () => "shared2@9.9.9"
			}
		}
	};
	expect(require("shared")).toBe("shared@1.9.9");
	expect(require("my-module")).toBe("shared@2.9.9");
	expect(require("my-module2")).toBe("shared@2.3.9");
	expect(() => require("my-module3")).toThrowError(
		"No satisfying version (^3.4.5) of shared module shared found in shared scope default.\n" +
			"Available versions: 9.9.9 from undefined, 1.9.9 from undefined, 1.2.9 from undefined, 1.2.3 from mfe1, 2.9.9 from undefined, 2.3.9 from undefined, 2.3.4 from undefined, 3.0.0 from undefined"
	);
	expect(require("my-module4")).toBe("shared@9.9.9");
	expectWarning();
	expect(require("shared2")).toBe("shared2@9.9.9");
	expectWarning(
		/No satisfying version \(=1\.2\.3 =3\.2\.1\) of shared module shared2 found in shared scope default/
	);
});
