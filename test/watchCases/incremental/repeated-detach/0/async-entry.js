/**
 * @returns {Promise<number>} current asynchronous value
 */
export function readAsync() {
	return import("./async-leaf").then((module) => module.default);
}
