const Anonymous = class<T> extends Base<T> implements Thing {
	private value?: T;
};
const Named = class Inner {
	declare field: string;
};
