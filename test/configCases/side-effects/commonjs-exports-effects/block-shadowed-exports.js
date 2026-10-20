{
	let exports = {
		set a(value) {
			global.cjsEffects.push("block-shadowed-exports");
		}
	};
	exports.a = 1;
}
