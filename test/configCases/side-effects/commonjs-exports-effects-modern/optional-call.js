var source = {
	run() {
		global.cjsModernEffects.push("optional-call");
	}
};
exports.a = source.run?.();
