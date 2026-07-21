export const eager = "EAGER_VALUE_123";
export let lazy = "LET_LIVE_BINDING_PAYLOAD";
export function bump() {
	lazy += "!";
}
