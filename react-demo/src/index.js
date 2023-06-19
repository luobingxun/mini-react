import React from 'react';
import ReactDOM from 'react-dom';

function App() {
	return (
		<div>
			<p>
				<Child />
			</p>
		</div>
	);
}

function Child() {
	return (
		<p>
			<span>我是p标签</span>
		</p>
	);
}

const root = document.querySelector('#root');
ReactDOM.createRoot(root).render(<App />);

// console.log(React);
// console.log(jsx);
// console.log(ReactDOM);
