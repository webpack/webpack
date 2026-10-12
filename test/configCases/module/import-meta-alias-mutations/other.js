export const meta = import.meta;

/**
 * @returns {number | undefined} the custom value belonging to this module
 */
export function readCustom() {
	return import.meta.custom;
}

/**
 * @returns {string | undefined} the direct value belonging to this module
 */
export function readDirect() {
	return import.meta.direct;
}
