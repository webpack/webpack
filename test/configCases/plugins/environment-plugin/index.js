it("should import a single process.env var", function() {
	if(process.env.AAA !== "aaa")
		require.include("aaa");
});

it("should import multiple process.env vars", function() {
	if(process.env.BBB !== "bbb")
		require.include("bbb");
	if(process.env.CCC !== "ccc")
		require.include("ccc");
});

it("should warn when a process.env variable is undefined", function() {
	if(process.env.DDD !== "ddd")
		require.include("ddd");
});
