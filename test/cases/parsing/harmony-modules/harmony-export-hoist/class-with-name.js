import c from "./get-class-with-name";

export default class def {
	f() {
		return "ok";
	}
}

expect(new c().f()).toBe("ok");
if (process.env.NODE_ENV !== "production") expect(c.name).toBe("def");
expect(def).toBe(c);
