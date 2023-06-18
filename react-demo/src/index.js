import React from 'react';
import ReactDOM from 'react-dom';

const jsx = (
	<div>
		<div>
			<span>
				<p>我是p标签</p>
			</span>
		</div>
	</div>
);

const root = document.querySelector('#root');
ReactDOM.createRoot(root).render(jsx);

// console.log(React);
// console.log(jsx);
// console.log(ReactDOM);
