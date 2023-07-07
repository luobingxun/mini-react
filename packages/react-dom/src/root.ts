import type { ReactElementType } from 'shared/ReactTypes';
import type { Container } from './hostConfig';
import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler';
import { initEvent } from './sytheticEvent';

export function createRoot(container: Container) {
	const root = createContainer(container);
	initEvent(container, 'click');
	return {
		render: (element: ReactElementType) => {
			return updateContainer(element, root);
		}
	};
}
