var Object = {
	defineProperty: function () {
		global.cjsEffects.push("define-shadowed-object");
	}
};
Object.defineProperty(exports, "a", { value: 1 });
