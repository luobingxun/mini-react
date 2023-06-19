import type {
	Action,
	Key,
	Props,
	ReactElementType,
	Ref,
	Type
} from 'shared/ReactTypes';
import { FunctionComponent, HostComponent, type WorkTags } from './workTags';
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
	subtreeFlags: Flags;

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
		this.subtreeFlags = NoFlags;

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
	let workInProgress = current.alternate;

	// 为null对应mount
	if (workInProgress === null) {
		workInProgress = new FiberNode(current.tag, peddingProps, current.key);
		workInProgress.stateNode = current.stateNode;

		workInProgress.alternate = current;
		current.alternate = workInProgress;
	} else {
		workInProgress.flags = NoFlags;
		workInProgress.peddingProps = peddingProps;
	}

	workInProgress.type = current.type;
	workInProgress.child = current.child;
	workInProgress.updateQueue = current.updateQueue;
	workInProgress.memoizedProps = current.memoizedProps;
	workInProgress.memoizedState = current.memoizedState;

	return workInProgress;
}

export function createFiberFromElement(element: ReactElementType) {
	const { type, key, props } = element;
	let fiberTag: WorkTags = FunctionComponent;

	if (typeof type === 'string') {
		fiberTag = HostComponent;
	} else {
		if (__DEV__) {
			console.log('createFiberFromElement从元素创建fiber为实现类型', element);
		}
	}

	const fiber = new FiberNode(fiberTag, props, key);

	fiber.type = type;

	return fiber;
}
