type Element<T> = T extends (infer U)[] ? U : T;
