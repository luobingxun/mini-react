import { Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './workTags';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	type UpdateQueue
} from './updateQueue';
import type { ReactElementType } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { requestUpdateLane } from './fiberLane';

export function createContainer(container: Container) {
	const hostRootFiber = new FiberNode(HostRoot, {}, null);
	const root = new FiberRootNode(container, hostRootFiber);
	hostRootFiber.updateQueue = createUpdateQueue();
	return root;
}

export function updateContainer(
	element: ReactElementType,
	root: FiberRootNode
) {
	const lane = requestUpdateLane();
	const current = root.current;
	const update = createUpdate<ReactElementType>(element, lane);
	enqueueUpdate(current.updateQueue as UpdateQueue<ReactElementType>, update);
	scheduleUpdateOnFiber(current, lane);
	return element;
}
