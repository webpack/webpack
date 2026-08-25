import bound from "../_images/file.png";
// eslint-disable-next-line no-unused-vars
import unread from "../_images/file.jpg";

// Written only so the file is emitted; nothing reads a binding.
import "../_images/file.svg";

/**
 * @param {string} name the emitted file to look for
 * @returns {boolean} true when the build emitted it
 */
const emitted = (name) =>
	__STATS__.assets.some((asset) => asset.name === name);

it("should keep the file a bare import was written for", () => {
	// Asset modules are side-effect-free under 'futureDefaults', which is what
	// lets the unread import below be dropped — a bare one still has to emit.
	expect(emitted("file.svg")).toBe(true);
});

it("should still emit an asset whose binding is read", () => {
	expect(bound).toMatch(/file\.png$/);
	expect(emitted("file.png")).toBe(true);
});

it("should drop an asset whose binding nothing reads", () => {
	expect(emitted("file.jpg")).toBe(false);
});
