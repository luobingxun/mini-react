import {
	Container,
	appendInintialChild,
	createInstance,
	createTextInstance
} from 'hostConfig';
import { FiberNode } from './fiber';
import { HostComponent, HostRoot, HostText } from './workTags';
import { Flags, NoFlags } from './fiberFlags';

export function completeWork(workInProgress: FiberNode) {
	const newProps = workInProgress.peddingProps;
	const current = workInProgress.alternate;

	switch (workInProgress.tag) {
		case HostComponent:
			if (current !== null && workInProgress.stateNode) {
				// update
			} else {
				// mount
				const instance = createInstance(workInProgress.tag, newProps);
				appendAllChildren(instance, workInProgress);
				workInProgress.stateNode = instance;
			}
			bubbleProperties(workInProgress);
			return null;
		case HostRoot:
			return null;
		case HostText:
			if (current !== null && workInProgress.stateNode) {
				// update
			} else {
				// mount
				const instance = createTextInstance(
					workInProgress.tag,
					newProps.content
				);
				workInProgress.stateNode = instance;
			}
			bubbleProperties(workInProgress);
			return null;
		default:
			if (__DEV__) {
				console.log('completeWork中为实现的tag');
			}
	}

	return null;
}

function appendAllChildren(parent: Container, workInProgress: FiberNode) {
	let node: FiberNode | null = workInProgress.child;

	while (node !== null) {
		if (node.tag === HostComponent || node.tag === HostRoot) {
			appendInintialChild(parent, workInProgress.stateNode);
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
