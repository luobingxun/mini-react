import type { ReactElementType } from 'shared/ReactTypes';
import type { Container } from './hostConfig';
import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler';

export function createRoot(container: Container) {
	const root = createContainer(container);
	return {
		render: (element: ReactElementType) => {
			updateContainer(element, root);
		}
	};
}
