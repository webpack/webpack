import f from "./get-func-with-args-no-name";

expect(f(123)).toBe("ok123");

export default function (x) {
	return "ok" + x;
}
