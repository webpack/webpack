module.exports = {
	set a(v) {
		global.cjsSetterMarker = v;
	}
};
module.exports.a = 1;
