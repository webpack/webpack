if (typeof EventTarget !== "function") {
	throw new Error("Environment doesn't support EventTarget");
}

module.exports = new EventTarget();
