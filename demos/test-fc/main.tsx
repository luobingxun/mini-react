import React from 'react';
import ReactDOM from 'react-dom/client';

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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
