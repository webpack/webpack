const connectToDB = async url => {
	await new Promise(r => setTimeout(r, 1000));
}

await connectToDB("my-sql://example.com");

export const dbCall = async data => {
	await new Promise(r => setTimeout(r, 100));
	return "fake data";
}
