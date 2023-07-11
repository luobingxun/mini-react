import {
	Container,
	appendInintialChild,
	createInstance,
	createTextInstance
} from 'hostConfig';
import { FiberNode } from './fiber';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
	Fragment
} from './workTags';
import { Flags, NoFlags, Update } from './fiberFlags';
import { updateFiberProps } from 'react-dom/src/sytheticEvent';

function markUpdate(fiber: FiberNode) {
	fiber.flags |= Update;
}

export function completeWork(workInProgress: FiberNode) {
	const newProps = workInProgress.peddingProps;
	const current = workInProgress.alternate;
	switch (workInProgress.tag) {
		case HostComponent:
			if (current !== null && workInProgress.stateNode) {
				// update
				updateFiberProps(workInProgress.stateNode, newProps);
			} else {
				// mount
				const instance = createInstance(workInProgress.type, newProps);
				appendAllChildren(instance, workInProgress);
				workInProgress.stateNode = instance;
			}
			bubbleProperties(workInProgress);
			return null;
		case HostText:
			if (current !== null && workInProgress.stateNode) {
				const oldText = current.memoizedProps.content;
				const newText = newProps.content;
				if (oldText !== newText) {
					markUpdate(workInProgress);
				}
			} else {
				// mount
				const instance = createTextInstance(newProps.content);
				workInProgress.stateNode = instance;
			}
			bubbleProperties(workInProgress);
			return null;
		case HostRoot:
		case Fragment:
		case FunctionComponent:
			bubbleProperties(workInProgress);
			return null;
		default:
			if (__DEV__) {
				console.log('completeWork中为实现的tag');
			}
			break;
	}

	return null;
}

function appendAllChildren(parent: Container, workInProgress: FiberNode) {
	let node: FiberNode | null = workInProgress.child;

	while (node !== null) {
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInintialChild(parent, node.stateNode);
		} else if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === workInProgress) {
			return;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === workInProgress) {
				return;
			}
			node = node.return;
		}
		node.sibling.return = node.return;
		node = node.sibling;
	}
}

function bubbleProperties(workInProgress: FiberNode) {
	let subTreeFlags: Flags = NoFlags;
	let child = workInProgress.child;

	while (child !== null) {
		subTreeFlags |= child.flags;
		subTreeFlags |= child.subtreeFlags;

		child.return = workInProgress;
		child = child.sibling;
	}

	workInProgress.subtreeFlags |= subTreeFlags;
}
