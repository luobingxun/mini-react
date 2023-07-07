import React, { useState } from 'react';
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
	const [num] = useState(10076876);
	return (
		<p>
			<span>{num}</span>
		</p>
	);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
