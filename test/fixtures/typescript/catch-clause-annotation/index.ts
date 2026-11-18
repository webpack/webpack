try {
	risky();
} catch (error: unknown) {
	console.log(error);
}
try {} catch ({ message }: any) {}
