import { FiberNode } from './fiber';

export function renderWithHooks(workInProgress: FiberNode) {
	const props = workInProgress.peddingProps;
	const Component = workInProgress.type;
	const children = Component(props);
	return children;
}
