var never = false;

it("should import a single process.env var", () => {
	if (process.env.AAA !== "aaa") if (never) require("aaa");
});

it("should import multiple process.env vars", () => {
	if (process.env.BBB !== "bbb") if (never) require("bbb");
	if (process.env.CCC !== "ccc") if (never) require("ccc");
});

it("should error when a process.env variable is undefined", () => {
	if (process.env.DDD !== "ddd") if (never) require("ddd");
});

it("should import an array of process.env vars", () => {
	if (process.env.EEE !== "eee") if (never) require("eee");
	if (process.env.FFF !== "fff") if (never) require("fff");
});

it("should import multiple process.env var with default values", () => {
	if (process.env.GGG !== "ggg") if (never) require("ggg");
	if (process.env.HHH !== "hhh") if (never) require("hhh");
});

it("should import process.env var with empty value", () => {
	if (process.env.III !== "") if (never) require("iii");
});
