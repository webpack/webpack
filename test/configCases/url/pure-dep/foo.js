const pureUrl1 = new URL("./lang/foo.json", import.meta.url);

export const foo = "foo";

export const pureUrl2 = new URL("./lang/" + "foo" + ".json", import.meta.url);

export const pureUrl3 = new URL(`./lang/${"foo"}.json`, import.meta.url);

export const impureUrl1 = new URL(
	"./lang/" + (global.foo = "foo") + ".json",
	import.meta.url
);

export const impureUrl2 = new URL("https://test.cases/lang/foo.json");
