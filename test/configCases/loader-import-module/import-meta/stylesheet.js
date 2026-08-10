const meta = import.meta;
const { url } = import.meta;
const spread = { ...import.meta };
export default [
	`url=${import.meta.url}`,
	`aliasUrl=${meta.url}`,
	`destructuredUrl=${url}`,
	`spreadUrlType=${typeof spread.url}`,
	`unknownType=${typeof import.meta.hot}`
].join(" ");
