const hint = new URL(
	/* webpackPrefetch: true */ './image.png?c=" data-x="5',
	import.meta.url
);

export default hint;
