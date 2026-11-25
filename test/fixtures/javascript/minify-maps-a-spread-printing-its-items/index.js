function run() {
	var a = [one(), two()];
	sink(...a);
	var o = { x: three() };
	sink({ ...o, y: 4 });
}
