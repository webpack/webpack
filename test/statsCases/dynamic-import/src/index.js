import React from 'react'
import { createRoot } from 'react-dom/client'

const Loading = () => 'Loading...'

class AsyncComponent extends React.Component {

	state = { Component: Loading }

	constructor(props) {
		super(props)
		import(/* webpackChunkName: 'pages/[request]' */ `./pages/${props.page}`)
			.then(({ default: Component }) => this.setState({ Component }))
	}

	render() {
		const { state: { Component } } = this
		return <Component />
	}
}

const App = () => <AsyncComponent page='home' />
const root = createRoot(document.getElementById('app'))

root.render(<App />)
