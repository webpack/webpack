var descriptor = {
	get value() {
		global.cjsEffects.push("define-descriptor-prototype");
		return 1;
	}
};
Object.defineProperty(exports, "a", { __proto__: descriptor });
