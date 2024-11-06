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
		},
		shared3: {
			"1.1.1": {
				get: () => () => "shared3@1.1.1"
			},
			"1.0.0": {
				get: () => () => "shared3@1.0.0"
			}
		},
		shared4: {
			"1.1.1": {
				get: () => () => "shared4@1.1.1"
			}
		},
		shared5: {
			"1.0.0": {
				get: () => () => "shared5@1.0.0"
			}
		},
		shared6: {
			"1.0.0": {
				get: () => () => "shared6@1.0.0"
			}
		},
		shared7: {
			"1.0.0": {
				get: () => () => "shared7@1.0.0"
			}
		},
		shared8: {
			"1.0.0": {
				get: () => () => "shared8@1.0.0"
			}
		},
		shared9: {
			"1.0.0": {
				get: () => () => "shared9@1.0.0"
			}
		},
		shared10: {
			"1.0.0": {
				get: () => () => "shared10@1.0.0"
			}
		},
		shared11: {
			"1.0.0": {
				get: () => () => "shared11@1.0.0"
			}
		},
		shared12: {
			"1.0.0": {
				get: () => () => "shared12@1.0.0"
			}
		},
		shared13: {
			"1.0.0": {
				get: () => () => "shared13@1.0.0"
			}
		},
		shared14: {
			"1.0.0": {
				get: () => () => "shared14@1.0.0"
			}
		},
		shared15: {
			"1.1.1": {
				get: () => () => "shared15@1.1.1"
			}
		},
		shared16: {
			"1.0.0": {
				get: () => () => "shared16@1.0.0"
			}
		},
		shared17: {
			"1.0.0": {
				get: () => () => "shared17@1.0.0"
			}
		},
		shared18: {
			"1.0.0": {
				get: () => () => "shared18@1.0.0"
			}
		},
		shared19: {
			"1.0.0": {
				get: () => () => "shared19@1.0.0"
			}
		},
		shared20: {
			"1.0.0": {
				get: () => () => "shared20@1.0.0"
			}
		},
		shared21: {
			"1.0.0": {
				get: () => () => "shared21@1.0.0"
			}
		},
		shared22: {
			"1.0.0": {
				get: () => () => "shared22@1.0.0"
			}
		},
		shared23: {
			"1.0.0": {
				get: () => () => "shared23@1.0.0"
			}
		},
		shared24: {
			"1.0.0": {
				get: () => () => "shared24@1.0.0"
			}
		},
		shared25: {
			"1.0.0": {
				get: () => () => "shared25@1.0.0"
			}
		},
		shared25: {
			"1.0.0": {
				get: () => () => "shared26@1.0.0"
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
	expect(require("shared3")).toBe("shared3@1.0.0");
	expect(require("shared4")).toBe("shared4@1.1.1");
	expect(require("shared5")).toBe("shared5@1.0.0");
	expect(require("shared6")).toBe("shared6@1.0.0");
	expect(require("shared7")).toBe("shared7@1.0.0");
	expect(require("shared8")).toBe("shared8@1.0.0");
	expect(require("shared9")).toBe("shared9@1.0.0");
	expect(require("shared10")).toBe("shared10@1.0.0");
	expect(require("shared11")).toBe("shared11@1.0.0");
	expect(require("shared12")).toBe("shared12@1.0.0");
	expect(require("shared13")).toBe("shared13@1.0.0");
	expect(require("shared14")).toBe("shared14@1.0.0");
	expect(require("shared15")).toBe("shared15@1.1.1");
	expect(require("shared16")).toBe("shared16@1.0.0");
	expect(require("shared17")).toBe("shared17@1.0.0");
	expect(require("shared18")).toBe("shared18@1.0.0");
	expect(require("shared19")).toBe("shared19@1.0.0");
	expectWarning(
		/No satisfying version \(\^branch\) of shared module shared19 found in shared scope default/
	);
	expect(require("shared20")).toBe("shared20@1.0.0");
	expect(require("shared21")).toBe("shared21@1.0.0");
	expect(require("shared22")).toBe("shared22@1.0.0");
	expect(require("shared23")).toBe("shared23@1.0.0");
	expect(require("shared24")).toBe("shared24@1.0.0");
});
