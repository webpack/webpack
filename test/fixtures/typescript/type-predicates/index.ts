function isString(value: unknown): value is string {
	return typeof value === "string";
}
function assert(value: unknown): asserts value {}
function assertString(value: unknown): asserts value is string {}
class Guard {
	isThis(): this is Guard {
		return true;
	}
	assertThis(): asserts this {}
}
let asserts: asserts;
