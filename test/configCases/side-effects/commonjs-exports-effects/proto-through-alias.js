var alias = exports;
alias.__proto__ = {
	set a(value) {
		global.cjsEffects.push("proto-through-alias");
	}
};
exports.a = 1;
