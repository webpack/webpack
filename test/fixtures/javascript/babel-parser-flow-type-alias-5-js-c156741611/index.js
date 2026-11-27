type A = Foo<
  | {type: "A"}
  | {type: "B"}
>;

type B = Foo<
  & {type: "A"}
  & {type: "B"}
>;
