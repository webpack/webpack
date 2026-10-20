var target = new Proxy(
	{},
	{
		has: function () {
			global.cjsEffects.push("value-in-proxy");
			return true;
		}
	}
);
exports.a = "a" in target;
