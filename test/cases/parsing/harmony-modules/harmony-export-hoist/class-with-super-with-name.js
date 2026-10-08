import c from "./get-class-with-super-with-name";

class sup {
	g() {
		return "ok";
	}
}

export default class def extends sup {
	f() {
		return "ok";
	}
}

expect(new c().f()).toBe("ok");
expect(new c().g()).toBe("ok");
if (process.env.NODE_ENV !== "production") expect(c.name).toBe("def");
expect(c).toBe(def);
