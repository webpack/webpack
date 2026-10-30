var source = {
	get a() {
		global.cjsEffects.push("destructuring-assignment-target");
		return 1;
	}
};
({ a: exports.a } = source);
