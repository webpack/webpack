// Simulates pre-ES2015 engines (e.g. Chrome <= 42), where a function's `name`
// property is non-writable AND non-configurable and redefining it throws.
// Imported first, so the simulation is active while `./dep` initializes;
// `index.js` restores the originals afterwards.
export const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
export const originalDefineProperty = Object.defineProperty;

Object.getOwnPropertyDescriptor = function (obj, prop) {
	const descriptor = originalGetOwnPropertyDescriptor.apply(this, arguments);
	if (prop === "name" && typeof obj === "function" && descriptor) {
		descriptor.writable = false;
		descriptor.configurable = false;
	}
	return descriptor;
};

Object.defineProperty = function (obj, prop, _attributes) {
	if (prop === "name" && typeof obj === "function") {
		throw new TypeError("Cannot redefine property: name");
	}
	return originalDefineProperty.apply(this, arguments);
};
