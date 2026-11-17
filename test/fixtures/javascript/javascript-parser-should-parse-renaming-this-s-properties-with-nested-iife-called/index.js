// @ts-expect-error
				!function () {
					// @ts-expect-error
					!function () {
						// @ts-expect-error
						this.sub;
						// @ts-expect-error
					}.call(this);
				}.call(ijk);