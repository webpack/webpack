function loadScript(url) {
	return new Promise((resolve, reject) => {
		const script = document.createElement('script')
		script.src = url
		if (url.endsWith('.mjs')) {
			script.type = 'module'
		}

		script.onerror = (error) => {
			document.body.removeChild(script)
			reject(error)
		}

		script.onload = () => {
			resolve()
			document.body.removeChild(script)
		}

		document.body.append(script)
	})
}

loadScript('http://localhost:8000/bundle.js').then(() => loadScript('http://localhost:8000/bundle.js'))
