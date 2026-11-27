type X<U, T> = T extends [infer U extends T ? U : T] ? U : T;
