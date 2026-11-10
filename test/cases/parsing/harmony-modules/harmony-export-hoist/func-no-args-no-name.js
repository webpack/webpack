import f from "./get-func-no-args-no-name";

expect(f()).toBe("ok");

export default function () {
	return "ok";
}
