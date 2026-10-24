import "./pure";

const bundled = () => "./pure.js" in __webpack_modules__;

it("should keep the module only while it has effects or is used", () => {
	switch (WATCH_STEP) {
		case "0":
		case "2":
		case "5":
			expect(bundled()).toBe(false);
			break;
		case "1":
			expect(bundled()).toBe(true);
			expect(global.cjsToggleEffect).toBe("statement");
			break;
		case "4":
			expect(bundled()).toBe(true);
			expect(global.cjsToggleEffect).toBe("setter");
			break;
	}
	delete global.cjsToggleEffect;
});
