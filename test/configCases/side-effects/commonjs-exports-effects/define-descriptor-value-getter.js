Object.defineProperty(exports, "a", {
	get value() {
		global.cjsEffects.push("define-descriptor-value-getter");
		return 1;
	}
});
