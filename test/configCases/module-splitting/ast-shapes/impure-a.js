function touch() {
	return 1;
}
export const ka = "A_VALUE";
const sideA = touch(); // impure top-level var → source side-effect gate bails
export const useA = sideA;
