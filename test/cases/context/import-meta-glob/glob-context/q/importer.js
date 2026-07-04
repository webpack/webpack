export const modules = import.meta.glob(["../shared/*.js", "./*.js"], {
	eager: true
});
