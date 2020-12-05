if (Math.random() < 0) {
	require("common");
	require("uncommon");
}

it("should overwrite non-eager shared module with eager shared module", async () => {
	__webpack_require__.S = {
		default: {
			common: {
				'1.0.0': {
					eager: false,
					from: 'dashboard'
				}
			}
		}
	}
	await __webpack_init_sharing__("default");
	//await __webpack_require__.I("default");
	console.log(__webpack_share_scopes__);
	console.log(__webpack_share_scopes__.default);
	expect(Object.keys(__webpack_share_scopes__["default"])).toContain(
		"common"
	);
	const commonModule = __webpack_share_scopes__.default.common
	expect(Object.keys(commonModule)).toContain(
		"1.0.0"
	);
	expect(commonModule["1.0.0"].eager).toBe(true)
});
it("should not overwrite already shared eager module with non-eager module", async () => {
	__webpack_require__.S = {
		default: {
			uncommon: {
				'2.0.0': {
					eager: true,
					from: 'dashboard'
				}
			}
		}
	}
	await __webpack_init_sharing__("default");
	expect(Object.keys(__webpack_share_scopes__["default"])).toContain(
		"uncommon"
	);
	const uncommonModule = __webpack_share_scopes__.default.common
	expect(Object.keys(commonModule)).toContain(
		"2.0.0"
	);
	expect(commonModule["2.0.0"].eager).toBe(true)
});
