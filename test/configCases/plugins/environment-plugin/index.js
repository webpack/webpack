it("should import a single process.env var", () => {
	if(process.env.AAA !== "aaa")
		require.include("aaa");
});

it("should import multiple process.env vars", () => {
	if(process.env.BBB !== "bbb")
		require.include("bbb");
	if(process.env.CCC !== "ccc")
		require.include("ccc");
});

it("should warn when a process.env variable is undefined", () => {
	if(process.env.DDD !== "ddd")
		require.include("ddd");
});

it("should import an array of process.env vars", () => {
	if(process.env.EEE !== "eee")
		require.include("eee");
	if(process.env.FFF !== "fff")
		require.include("fff");
});

it("should import multiple process.env var with default values", () => {
	if(process.env.GGG !== "ggg")
		require.include("ggg");
	if(process.env.HHH !== "hhh")
		require.include("hhh");
});

it("should import process.env var with empty value", () => {
	if(process.env.III !== "")
		require.include("iii");
});

it("should import process.env var by process.env", () => {
	if(process.env.IIII !== "iiii") {
		if (parseInt(process.version.match(/^v(\d+).*$/i)[1]) > 4) {
			eval("let {IIII} = process.env;");
		} else {
			var env = process.env;
			var IIII = env.IIII;
		}
		if(IIII !== "iiii") {
			require.include("iiii");
		}
	}
});
