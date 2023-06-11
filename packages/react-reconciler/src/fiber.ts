import type { Key, Props, Ref, Type } from 'shared/ReactTypes';
import type { WorkTags } from './workTags';
import { type Flags, NoFlags } from './FiberFlags';

export class FiberNode {
	type: Type;
	key: Key;
	stateNode: any;
	tag: WorkTags;

	return: FiberNode | null;
	child: FiberNode | null;
	sibling: FiberNode | null;
	index: number;

	memoizeProps: Props;
	peddingProps: Props;
	ref: Ref;

	alternate: FiberNode | null;
	flags: Flags;

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
		this.memoizeProps = null;
		this.peddingProps = peddingProps;
		this.ref = null;

		// 双缓存切换
		this.alternate = null;
		this.flags = NoFlags;
	}
}
