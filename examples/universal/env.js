// Universal feature detection. The bundle assumes no platform-specific global at
// build time, so the environment is resolved at runtime instead.
export function platform() {
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
