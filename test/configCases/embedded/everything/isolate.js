/**
 * The one fragment `pattern` names, so a snapshot covers that construct alone
 * rather than every byte around it. Throws when nothing matches, since a
 * snapshot of `null` would pass for ever.
 * @param {string} source emitted text
 * @param {RegExp} pattern the construct to isolate
 * @returns {string} the matched fragment
 */
export function isolate(source, pattern) {
	const match = source.match(pattern);

	if (!match) {
		throw new Error(`Nothing in the emitted output matched ${pattern}`);
	}

	return match[0];
}
