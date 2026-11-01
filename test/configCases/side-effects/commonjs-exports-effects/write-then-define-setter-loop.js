for (var i = 0; i < 2; i++) {
	exports.a = 1;
	Object.defineProperty(exports, "a", {
		configurable: true,
		set: function () {
			global.cjsEffects.push("write-then-define-setter-loop");
		}
	});
}
