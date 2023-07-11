import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	const [num, setNum] = useState(false);
	// window.setNum = setNum;
	const arr =
		num === false
			? [
					<li key="1">1</li>,
					<>
						<li key="2">2</li>
					</>,
					<li key="3">3</li>
			  ]
			: [
					<>
						<li key="3">3</li>
					</>,
					<li key="2">2</li>,
					<li key="1">1</li>
			  ];

	const changeNum = () => {
		setNum(!num);
	};

	return (
		<>
			<div>
				<>sdfsdf</>
			</div>
			<ul onClick={changeNum}>{arr}</ul>
		</>
	);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
