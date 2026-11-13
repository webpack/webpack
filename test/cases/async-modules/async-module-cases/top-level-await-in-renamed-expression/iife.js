export const value = (function (r) {
	return r === URL;
})(true ? URL : await Promise.resolve(0));
