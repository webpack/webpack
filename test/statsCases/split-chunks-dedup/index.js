export default async () => {
	const { test } = await import(/* webpackMode: "eager" */'./module')

	test()
};
