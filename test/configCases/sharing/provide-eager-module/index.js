if (Math.random() < 0) {
	require("common");
	require("uncommon");
}

it("should overwrite non-eager shared module with eager shared module", async () => {
	__webpack_require__.S = {
		eagerOverrideNonEager: {
			common: {
				"1.0.0": {
					eager: undefined, // any falsy value
					from: "dashboard"
				}
			}
		}
	};
	await __webpack_init_sharing__("eagerOverrideNonEager");
	expect(
		Object.keys(__webpack_share_scopes__["eagerOverrideNonEager"])
	).toContain("common");
	const commonModule = __webpack_share_scopes__.eagerOverrideNonEager.common;
	expect(Object.keys(commonModule)).toContain("1.0.0");
	expect(commonModule["1.0.0"].eager).toBe(true);
});
it("should not overwrite already shared eager module with non-eager module", async () => {
	__webpack_require__.S = {
		nonEagerDontOverrideEager: {
			uncommon: {
				"2.0.0": {
					eager: 1, // any truthy value
					from: "aaa"
				}
			}
		}
	};
	await __webpack_init_sharing__("nonEagerDontOverrideEager");
	expect(
		Object.keys(__webpack_share_scopes__["nonEagerDontOverrideEager"])
	).toContain("uncommon");
	const uncommonModule =
		__webpack_share_scopes__.nonEagerDontOverrideEager.uncommon;
	expect(Object.keys(uncommonModule)).toContain("2.0.0");
	expect(uncommonModule["2.0.0"].eager).toBe(1);
});
it("should prefer shared non-eager module from newer container", async () => {
	__webpack_require__.S = {
		newerNonEager: {
			uncommon: {
				"2.0.0": {
					from: "appshell-1.0"
				}
			}
		}
	};
	await __webpack_init_sharing__("newerNonEager");
	const uncommonModule = __webpack_share_scopes__.newerNonEager.uncommon;
	expect(Object.keys(uncommonModule)).toContain("2.0.0");
	expect(uncommonModule["2.0.0"].from).toBe("appshell-2.0");
});
it("should prefer shared eager module from newer container", async () => {
	__webpack_require__.S = {
		newerEager: {
			common: {
				"1.0.0": {
					from: "appshell-1.0",
					eager: true
				}
			}
		}
	};
	await __webpack_init_sharing__("newerEager");
	const commonModule = __webpack_share_scopes__.newerEager.common;
	expect(Object.keys(commonModule)).toContain("1.0.0");
	expect(commonModule["1.0.0"].from).toBe("appshell-2.0");
});
