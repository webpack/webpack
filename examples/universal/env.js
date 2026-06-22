// Universal feature detection. The bundle assumes no platform-specific global at
// build time, so the environment is resolved at runtime instead. Deno and Bun
// are checked before Node because both also expose a Node-compatible `process`.
export function platform() {
	if (typeof Deno !== "undefined") return "Deno";

	if (typeof Bun !== "undefined") return "Bun";

	if (typeof window !== "undefined") return "browser";

	if (
		typeof process !== "undefined" &&
		process.versions &&
		process.versions.node
	) {
		return "Node.js";
	}

	return "unknown";
}
