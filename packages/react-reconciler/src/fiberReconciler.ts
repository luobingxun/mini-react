import { Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './workTags';
import {
	type Update,
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	type UpdateQueue
} from './updateQueue';
import type { Action, ReactElementType } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';

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
	const current = root.current;
	const update = createUpdate<ReactElementType>(element);
	enqueueUpdate(
		current.updateQueue as UpdateQueue<Action<ReactElementType>>,
		update as Update<Action<ReactElementType>>
	);
	scheduleUpdateOnFiber(current);
	return element;
}
