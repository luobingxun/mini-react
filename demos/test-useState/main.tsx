import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	const [num, setNum] = useState(1);
	window.setNum = setNum;
	return (
		<div onClick={() => setNum(num + 1)}>
			{num === 3 ? <Child /> : <div>{num}</div>}
		</div>
	);
}

function Child() {
	return <span>React</span>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
