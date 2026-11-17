// eslint-disable-next-line one-var
				let abc, cde, fgh;
				// @ts-expect-error
				abc("test");
				// @ts-expect-error
				cde.abc("test");
				// @ts-expect-error
				cde.ddd.abc("test");
				fgh;
				// @ts-expect-error
				fgh.sub;