import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	const [num, updateNum] = useState(0);

	useEffect(() => {
		console.log('App mount');
	}, []);

	useEffect(() => {
		console.log('num change create', num);

		return () => {
			console.log('num change destroy', num);
		};
	}, [num]);

	return (
		<ul
			onClick={(e) => {
				updateNum((num: number) => num + 1);
			}}
		>
			你好
			{num === 1 ? num : <Child />}
		</ul>
	);
}

function Child() {
	useEffect(() => {
		console.log('Child mount');

		return () => {
			console.log('Child unmount');
		};
	}, []);
	return <p>i am child.</p>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
