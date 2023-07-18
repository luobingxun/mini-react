import { FiberRootNode } from './fiber';

export type Lane = number;
export type Lanes = number;

export const NoLane = 0b0000;
export const NoLanes = 0b0000;
export const SyncLane = 0b0001;

export function mergeLanes(laneA: Lane, laneB: Lane): Lane {
	return laneA | laneB;
}

export function requestUpdateLane(): Lane {
	return SyncLane;
}

export function getHightestPriorityLane(lanes: Lanes): Lane {
	return lanes & -lanes;
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.peddingLanes &= ~lane;
}
