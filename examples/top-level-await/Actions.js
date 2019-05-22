const UserApi = import("./UserApi.js");

export const CreateUserAction = async name => {
	const { createUser } = await UserApi;
	await createUser(name);
};
