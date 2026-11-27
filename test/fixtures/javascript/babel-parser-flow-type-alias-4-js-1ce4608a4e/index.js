type union =
 | {type: "A"}
 | {type: "B"}
;

type overloads =
  & ((x: string) => number)
  & ((x: number) => string)
;

type union2 = {
  x:
    | {type: "A"}
    | {type: "B"}
};

type overloads2 = {
  x:
    & {type: "A"}
    & {type: "B"}
};
