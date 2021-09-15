"use strict";

const {
	cleverMerge,
	DELETE,
	removeOperations,
	resolveByProperty,
	cachedCleverMerge
} = require("../lib/util/cleverMerge");

describe("cleverMerge", () => {
	const base = {
		a1: [1],
		a2: [1],
		a3: [1],
		b1: [1, "...", 2],
		b2: [1, "...", 2],
		b3: [1, "...", 2],
		bySomething: {
			x: {
				a2: [5],
				a3: [5, "...", 6],
				a4: [5],
				a5: [5, "...", 6],
				b2: [5],
				b3: [5, "...", 6],
				b4: [5],
				b5: [5, "...", 6]
			}
		}
	};
	const cases = {
		"different properties": [{ a: 1 }, { b: 2 }, { a: 1, b: 2 }],
		"same property": [{ a: 1 }, { a: 2 }, { a: 2 }],
		arrays: [
			{ a1: 1, a2: 1, b1: [], b2: [], c1: [1], c2: [1] },
			{
				a1: [2],
				a2: [2, "...", 3],
				b1: [2],
				b2: [2, "...", 3],
				c1: [2],
				c2: [2, "...", 3]
			},
			{
				a1: [2],
				a2: [2, 1, 3],
				b1: [2],
				b2: [2, 3],
				c1: [2],
				c2: [2, 1, 3]
			}
		],
		"by field override": [
			base,
			{
				a1: [8],
				a2: [8],
				a3: [8],
				a4: [8],
				a5: [8],
				b1: [8],
				b2: [8],
				b3: [8],
				b4: [8],
				b5: [8]
			},
			{
				a1: [8],
				a2: [8],
				a3: [8],
				a4: [8],
				a5: [8],
				b1: [8],
				b2: [8],
				b3: [8],
				b4: [8],
				b5: [8]
			}
		],
		"by field extend default": [
			base,
			{
				a1: [8, "..."],
				a2: [8, "..."],
				a3: [8, "..."],
				a4: [8, "..."],
				a5: [8, "..."],
				b1: [8, "..."],
				b2: [8, "..."],
				b3: [8, "..."]
			},
			{
				a1: [8, 1],
				a2: [8, 1],
				a3: [1],
				a4: [8, "..."],
				b1: [8, 1, "...", 2],
				b2: [8, 1, "...", 2],
				b3: [1, "...", 2],
				bySomething: {
					x: {
						a2: [8, 5],
						a3: [8, 5, "...", 6],
						a4: [8, 5],
						a5: [8, 5, "...", 6],
						b2: [8, 5],
						b3: [8, 5, "...", 6],
						b4: [5],
						b5: [5, "...", 6]
					},
					default: {
						a3: [8, "..."],
						a5: [8, "..."],
						b3: [8, "..."]
					}
				}
			}
		],
		"by field override other": [
			base,
			{
				bySomething: {
					y: {
						a1: [8],
						a2: [8],
						a3: [8],
						a4: [8],
						a5: [8],
						b1: [8],
						b2: [8],
						b3: [8],
						b4: [8],
						b5: [8]
					}
				}
			},
			{
				a1: [1],
				a2: [1],
				a3: [1],
				b1: [1, "...", 2],
				b2: [1, "...", 2],
				b3: [1, "...", 2],
				bySomething: {
					x: {
						a2: [5],
						a3: [5, "...", 6],
						a4: [5],
						a5: [5, "...", 6],
						b2: [5],
						b3: [5, "...", 6],
						b4: [5],
						b5: [5, "...", 6]
					},
					y: {
						a1: [8],
						a2: [8],
						a3: [8],
						a4: [8],
						a5: [8],
						b1: [8],
						b2: [8],
						b3: [8],
						b4: [8],
						b5: [8]
					}
				}
			}
		],
		"by field override same": [
			base,
			{
				bySomething: {
					x: {
						a1: [8],
						a2: [8],
						a3: [8],
						a4: [8],
						a5: [8],
						b1: [8],
						b2: [8],
						b3: [8],
						b4: [8],
						b5: [8]
					}
				}
			},
			{
				a1: [1],
				a2: [1],
				a3: [1],
				b1: [1, "...", 2],
				b2: [1, "...", 2],
				b3: [1, "...", 2],
				bySomething: {
					x: {
						a1: [8],
						a2: [8],
						a3: [8],
						a4: [8],
						a5: [8],
						b1: [8],
						b2: [8],
						b3: [8],
						b4: [8],
						b5: [8]
					}
				}
			}
		],
		"by field extend other": [
			base,
			{
				bySomething: {
					y: {
						a1: [8, "..."],
						a2: [8, "..."],
						a3: [8, "..."],
						a4: [8, "..."],
						a5: [8, "..."],
						b1: [8, "..."],
						b2: [8, "..."],
						b3: [8, "..."]
					}
				}
			},
			{
				a1: [1],
				a2: [1],
				a3: [1],
				b1: [1, "...", 2],
				b2: [1, "...", 2],
				b3: [1, "...", 2],
				bySomething: {
					x: {
						a2: [5],
						a3: [5, "...", 6],
						a4: [5],
						a5: [5, "...", 6],
						b2: [5],
						b3: [5, "...", 6],
						b4: [5],
						b5: [5, "...", 6]
					},
					y: {
						a1: [8, "..."],
						a2: [8, "..."],
						a3: [8, "..."],
						a4: [8, "..."],
						a5: [8, "..."],
						b1: [8, "..."],
						b2: [8, "..."],
						b3: [8, "..."]
					}
				}
			}
		],
		"by field extend same": [
			base,
			{
				bySomething: {
					x: {
						a1: [8, "..."],
						a2: [8, "..."],
						a3: [8, "..."],
						a4: [8, "..."],
						a5: [8, "..."],
						b1: [8, "..."],
						b2: [8, "..."],
						b3: [8, "..."]
					}
				}
			},
			{
				a1: [1],
				a2: [1],
				a3: [1],
				b1: [1, "...", 2],
				b2: [1, "...", 2],
				b3: [1, "...", 2],
				bySomething: {
					x: {
						a1: [8, "..."],
						a2: [8, 5],
						a3: [8, 5, "...", 6],
						a4: [8, 5],
						a5: [8, 5, "...", 6],
						b1: [8, "..."],
						b2: [8, 5],
						b3: [8, 5, "...", 6],
						b4: [5],
						b5: [5, "...", 6]
					}
				}
			}
		],
		"by field extend base, same and other": [
			base,
			{
				a1: [7, "..."],
				a2: [7, "..."],
				a3: [7, "..."],
				a4: [7, "..."],
				a5: [7, "..."],
				b1: [7, "..."],
				b2: [7, "..."],
				b3: [7, "..."],
				bySomething: {
					x: {
						a1: [8, "..."],
						a2: [8, "..."],
						a3: [8, "..."],
						a4: [8, "..."],
						a5: [8, "..."],
						b1: [8, "..."],
						b2: [8, "..."],
						b3: [8, "..."]
					},
					y: {
						a1: [9, "..."],
						a2: [9, "..."],
						a3: [9, "..."],
						a4: [9, "..."],
						a5: [9, "..."],
						b1: [9, "..."],
						b2: [9, "..."],
						b3: [9, "..."]
					}
				}
			},
			{
				a1: [7, 1],
				a2: [7, 1],
				a3: [1],
				a4: [7, "..."],
				b1: [7, 1, "...", 2],
				b2: [7, 1, "...", 2],
				b3: [1, "...", 2],
				bySomething: {
					x: {
						a1: [8, "..."],
						a2: [8, 7, 5],
						a3: [8, 7, 5, "...", 6],
						a4: [8, 7, 5],
						a5: [8, 7, 5, "...", 6],
						b1: [8, "..."],
						b2: [8, 7, 5],
						b3: [8, 7, 5, "...", 6],
						b4: [5],
						b5: [5, "...", 6]
					},
					y: {
						a1: [9, "..."],
						a2: [9, "..."],
						a3: [9, 7, "..."],
						a4: [9, "..."],
						a5: [9, 7, "..."],
						b1: [9, "..."],
						b2: [9, "..."],
						b3: [9, 7, "..."]
					},
					default: {
						a3: [7, "..."],
						a5: [7, "..."],
						b3: [7, "..."]
					}
				}
			}
		],
		"by field promoting edge cases": [
			{
				a: [1, "...", 2],
				b: [1, "...", 2],
				c: [1, "...", 2],
				d: [1, "...", 2],
				bySomething: {
					x: {
						a: [3, "...", 4],
						b: [3, "...", 4],
						d: [3, "...", 4]
					},
					y: {
						a: [5],
						b: [5]
					},
					default: {
						a: [6, "...", 7],
						c: [6, "...", 7]
					}
				}
			},
			{
				a: [8, "...", 9],
				b: [8, "...", 9],
				c: [8, "...", 9],
				d: [8, "...", 9]
			},
			{
				a: [1, "...", 2],
				b: [1, "...", 2],
				c: [1, "...", 2],
				d: [1, "...", 2],
				bySomething: {
					x: {
						a: [8, 3, "...", 4, 9],
						b: [8, 3, "...", 4, 9],
						c: [8, "...", 9],
						d: [8, 3, "...", 4, 9]
					},
					y: {
						a: [8, 5, 9],
						b: [8, 5, 9],
						c: [8, "...", 9],
						d: [8, "...", 9]
					},
					default: {
						a: [8, 6, "...", 7, 9],
						b: [8, "...", 9],
						c: [8, 6, "...", 7, 9],
						d: [8, "...", 9]
					}
				}
			}
		],
		"by field clone default": [
			{
				a: 1,
				bySomething: {
					x: {
						b: 2
					},
					default: {
						c: 3
					}
				}
			},
			{
				bySomething: {
					y: {
						d: 4
					}
				}
			},
			{
				a: 1,
				bySomething: {
					x: {
						b: 2
					},
					y: {
						c: 3,
						d: 4
					},
					default: {
						c: 3
					}
				}
			}
		],
		deleting: [
			base,
			{
				a1: DELETE,
				a2: DELETE,
				a3: DELETE,
				a4: DELETE,
				a5: DELETE,
				b1: DELETE,
				b2: DELETE,
				b3: DELETE
			},
			{
				a1: DELETE,
				a2: DELETE,
				a3: DELETE,
				a4: DELETE,
				a5: DELETE,
				b1: DELETE,
				b2: DELETE,
				b3: DELETE,
				bySomething: {
					x: {
						b4: [5],
						b5: [5, "...", 6]
					}
				}
			}
		],
		"merge objects": [
			{
				nested: base
			},
			{
				nested: base
			},
			{
				nested: {
					a1: [1],
					a2: [1],
					a3: [1],
					b1: [1, 1, "...", 2, 2],
					b2: [1, 1, "...", 2, 2],
					b3: [1, "...", 2],
					bySomething: {
						x: {
							a2: [5],
							a3: [5, "...", 6],
							a4: [5],
							a5: [5, 5, "...", 6, 6],
							b2: [5],
							b3: [5, 1, 5, "...", 6, 2, 6],
							b4: [5],
							b5: [5, 5, "...", 6, 6]
						},
						default: {
							b3: [1, "...", 2]
						}
					}
				}
			}
		],
		dynamicSecond: [
			{
				a: 4, // keep
				b: 5, // static override
				c: 6 // dynamic override
			},
			{
				b: 50,
				y: 20,
				byArguments: (x, y, z) => ({
					c: 60,
					x,
					y,
					z
				})
			},
			{
				a: 4,
				b: 50,
				c: 60,
				x: 1,
				y: 2,
				z: 3
			}
		],
		dynamicBoth: [
			{
				a: 4, // keep
				b: 5, // static override
				c: 6, // dynamic override
				byArguments: (x, y, z) => ({
					x, // keep
					y, // static override
					z // dynamic override
				})
			},
			{
				b: 50,
				y: 20,
				byArguments: (x, y, z) => ({
					c: 60,
					z: z * 10
				})
			},
			{
				a: 4,
				b: 50,
				c: 60,
				x: 1,
				y: 20,
				z: 30
			}
		],
		dynamicChained: [
			cleverMerge(
				{
					a: 6, // keep
					b: 7, // static override
					c: 8, // dynamic override
					d: 9, // static override (3rd)
					e: 10, // dynamic override (3rd)
					byArguments: (x, y, z, v, w) => ({
						x, // keep
						y, // static override
						z, // dynamic override
						v, // static override (3rd)
						w // dynamic override (3rd)
					})
				},
				{
					b: 70,
					y: 20,
					byArguments: (x, y, z) => ({
						c: 80,
						z: z * 10
					})
				}
			),
			{
				d: 90,
				v: 40,
				byArguments: (x, y, z, v, w) => ({
					e: 100,
					w: w * 10
				})
			},
			{
				a: 6,
				b: 70,
				c: 80,
				d: 90,
				e: 100,
				x: 1,
				y: 20,
				z: 30,
				v: 40,
				w: 50
			}
		],
		dynamicFalse1: [
			{
				a: 1,
				byArguments: () => false
			},
			{
				b: 2
			},
			false
		],
		dynamicFalse2: [
			{
				a: 1
			},
			{
				b: 2,
				byArguments: () => false
			},
			false
		],
		dynamicFalse3: [
			{
				a: 1,
				byArguments: () => false
			},
			{
				b: 2,
				byArguments: () => false
			},
			false
		],
		nonObject1: [1, 2, 2],
		nonObject2: [1, { a: 1 }, 1],
		nonObject3: [{ a: 1 }, 1, 1],
		nonObject4: [{ a: 1 }, undefined, { a: 1 }],
		nonObject5: [undefined, { a: 1 }, { a: 1 }]
	};
	for (const key of Object.keys(cases)) {
		const testCase = cases[key];
		it(`should merge ${key} correctly`, () => {
			let merged = cleverMerge(testCase[0], testCase[1]);
			let merged1 = cachedCleverMerge(testCase[0], testCase[1]);
			let merged2 = cachedCleverMerge(testCase[0], testCase[1]);
			expect(merged2).toBe(merged1);
			merged = resolveByProperty(merged, "byArguments", 1, 2, 3, 4, 5);
			merged1 = resolveByProperty(merged1, "byArguments", 1, 2, 3, 4, 5);
			merged2 = resolveByProperty(merged2, "byArguments", 1, 2, 3, 4, 5);
			expect(merged).toEqual(testCase[2]);
			expect(merged1).toEqual(testCase[2]);
			expect(merged2).toEqual(testCase[2]);
		});
	}

	it("should allow to remove operations", () => {
		expect(
			removeOperations({
				a: 1,
				b: DELETE,
				c: ["..."],
				d: [1, "...", 2],
				e: [1, 2, 3],
				f: {
					a: 1,
					b: DELETE,
					c: ["..."],
					d: [1, "...", 2],
					e: [1, 2, 3],
					f: {
						a: 1,
						b: DELETE,
						c: ["..."],
						d: [1, "...", 2],
						e: [1, 2, 3]
					}
				}
			})
		).toEqual({
			a: 1,
			c: [],
			d: [1, 2],
			e: [1, 2, 3],
			f: {
				a: 1,
				c: [],
				d: [1, 2],
				e: [1, 2, 3],
				f: {
					a: 1,
					c: [],
					d: [1, 2],
					e: [1, 2, 3]
				}
			}
		});
	});
});
