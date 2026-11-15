"use strict";

/**
 * Replaces `__<token>__` with `value`, and records which loader ran in a
 * comment, so a test sees which rules a `<style>` body went through.
 * @type {import("../../../../").LoaderDefinition<{ token: string, value: string }>}
 */
module.exports = function tokenLoader(source) {
	const { token, value } = this.getOptions();
	return `/* ${token} */\n${source.split(`__${token}__`).join(value)}`;
};
