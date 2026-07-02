if (typeof EventTarget !== "function") {
	throw new Error(
		"Environment doesn't support hot module replacement (requires EventTarget)"
	);
}

module.exports = new EventTarget();
