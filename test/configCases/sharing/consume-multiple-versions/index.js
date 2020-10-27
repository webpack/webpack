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
	await expect(import("shared")).resolves.toHaveProperty(
		"default",
		"shared@1.9.9"
	);
	await expect(import("my-module")).resolves.toHaveProperty(
		"default",
		"shared@2.9.9"
	);
	await expect(import("my-module2")).resolves.toHaveProperty(
		"default",
		"shared@2.3.9"
	);
	await expect(import("my-module3")).rejects.toHaveProperty(
		"message",
		"No satisfying version (^3.4.5) of shared module shared found in shared scope default.\n" +
			"Available versions: 9.9.9 from undefined, 1.9.9 from undefined, 1.2.9 from undefined, 1.2.3 from mfe1, 2.9.9 from undefined, 2.3.9 from undefined, 2.3.4 from undefined, 3.0.0 from undefined"
	);
	await expect(import("my-module4")).resolves.toHaveProperty(
		"default",
		"shared@9.9.9"
	);
	expectWarning();
	await expect(import("shared2")).resolves.toHaveProperty(
		"default",
		"shared2@9.9.9"
	);
	expectWarning(
		/No satisfying version \(=1\.2\.3 =3\.2\.1\) of shared module shared2 found in shared scope default/
	);
});
