import a from "app/widgets/a";
import b from "app/widgets/b";
import c from "app/widgets/c";


it("static imports order", () => {
	expect(a).toBe("main/widgets/a");
	expect(b).toBe("main/widgets/b");
	expect(c).toBe("foo/widgets/c");
});

const load = id => import(/* webpackMode: "eager" */ `app/widgets/${id}?query#hash`);

it("dynamic imports order", async () => {
	expect((await load("a")).default).toBe("main/widgets/a");
	expect((await load("b")).default).toBe("main/widgets/b");
	expect((await load("c")).default).toBe("foo/widgets/c");
});
