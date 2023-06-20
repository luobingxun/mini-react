import {
	type Dispatcher,
	resolveDispatcher,
	currentDispatcher
} from './src/currentDispatcher';
import { jsxDEV } from './src/jsx';

export { jsxDEV };

export const useState: Dispatcher['useState'] = (initialState) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useState(initialState);
};

// 数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRE = {
	currentDispatcher
};

export default {
	version: '0.0.0',
	createElement: jsxDEV
};
