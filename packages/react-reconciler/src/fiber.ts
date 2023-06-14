import type { Action, Key, Props, Ref, Type } from 'shared/ReactTypes';
import type { WorkTags } from './workTags';
import { type Flags, NoFlags } from './fiberFlags';
import { Container } from 'hostConfig';
import { UpdateQueue } from './updateQueue';

export class FiberNode {
	type: Type;
	key: Key;
	stateNode: any;
	tag: WorkTags;

	return: FiberNode | null;
	child: FiberNode | null;
	sibling: FiberNode | null;
	index: number;

	memoizedProps: Props;
	peddingProps: Props;
	memoizedState: Props;
	ref: Ref;

	alternate: FiberNode | null;
	flags: Flags;

	updateQueue: UpdateQueue<Action<any>> | null;

	constructor(tag: WorkTags, peddingProps: Props, key: Key) {
		// 实例
		this.tag = tag;
		this.key = key;
		this.stateNode = null;
		this.type = null;

		// 树结构
		this.return = null;
		this.child = null;
		this.sibling = null;
		this.index = 0;

		// 存储
		this.memoizedProps = null;
		this.peddingProps = peddingProps;
		this.memoizedState = null;

		this.ref = null;

		// 双缓存切换
		this.alternate = null;
		this.flags = NoFlags;

		this.updateQueue = null;
	}
}

export class FiberRootNode {
	current: FiberNode;
	container: Container;
	finishedWork: FiberNode | null;

	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		hostRootFiber.stateNode = this;
		this.finishedWork = null;
	}
}

export function createWorkInProgress(current: FiberNode, peddingProps: Props) {
	let wip = current.alternate;

	// 为null对应mount
	if (wip === null) {
		wip = new FiberNode(current.tag, {}, current.key);
		wip.stateNode = current.stateNode;

		wip.alternate = current;
		current.alternate = wip;
	} else {
		wip.flags = NoFlags;
		wip.peddingProps = peddingProps;
	}

	wip.type = current.type;
	wip.child = current.child;
	wip.updateQueue = current.updateQueue;
	wip.memoizedProps = current.memoizedProps;
	wip.memoizedState = current.memoizedState;

	return wip;
}
