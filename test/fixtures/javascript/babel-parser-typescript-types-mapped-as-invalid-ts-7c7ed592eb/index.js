type Foo<T> = { [K in keyof T as]: T[K] };
