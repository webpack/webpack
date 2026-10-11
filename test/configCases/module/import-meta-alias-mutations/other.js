export const meta = import.meta;

/**
 * @returns {number | undefined} the custom value belonging to this module
 */
export function readCustom() {
	return import.meta.custom;
}
