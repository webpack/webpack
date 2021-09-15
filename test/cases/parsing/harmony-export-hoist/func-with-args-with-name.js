import f from "./get-func-with-args-with-name";

expect(f(123)).toBe("ok123");
if (process.env.NODE_ENV !== "production") expect(f.name).toBe("def");
expect(def).toBe(f);

export default function def(x) {
	return "ok" + x;
}
