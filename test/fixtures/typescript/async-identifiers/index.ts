const async = 1;
const call = async(1);
const typedCall = async<number>(1);
const arrow = async (value: number) => value;
async function asyncFunction<T>(value: T): Promise<T> {
	return value;
}
