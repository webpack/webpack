import f from "./get-func-no-args-with-name";

expect(f()).toBe("ok");
expect(def).toBe(f);
if (process.env.NODE_ENV !== "production") expect(f.name).toBe("def");

export default function def() {
	return "ok";
}
