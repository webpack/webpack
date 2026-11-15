export const mode = "staging";
const resolve = () => (mode === "production" ? "prod" : "other");
export const resolved = resolve();
export function late() {
	return mode + "!";
}
