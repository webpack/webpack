const id = async <
  T extends unknown
>(x: T) => x;
const first = async<
  T,
  U,
>(x: T, y: U) => x;
const flat = async <T,>(x: T) => x;
