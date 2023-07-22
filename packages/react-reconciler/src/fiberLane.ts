import {
	unstable_IdlePriority,
	unstable_ImmediatePriority,
	unstable_NormalPriority,
	unstable_UserBlockingPriority,
	unstable_getCurrentPriorityLevel
} from 'scheduler';
import { FiberRootNode } from './fiber';
import internals from 'shared/internals';
const { reactCurrentBatchConfig } = internals;

export type Lane = number;
export type Lanes = number;

export const NoLane = 0b00000;
export const NoLanes = 0b00000;
export const SyncLane = 0b00001;
export const InputContinuousLane = 0b00010;
export const DefaultLane = 0b00100;
export const Transition = 0b01000;
export const IdleLane = 0b10000;

export function mergeLanes(laneA: Lane, laneB: Lane): Lane {
	return laneA | laneB;
}

export function requestUpdateLane(): Lane {
	const isTransition = reactCurrentBatchConfig.transition !== null;
	if (isTransition) {
		return Transition;
	}

	const schedulerPriority = unstable_getCurrentPriorityLevel();
	const lane = schedulerPriorityToLane(schedulerPriority);
	return lane;
}

export function isSubsetOfLanes(set: Lanes, subset: Lane): boolean {
	return (set & subset) === subset;
}

export function getHighestPriorityLane(lanes: Lanes): Lane {
	return lanes & -lanes;
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.peddingLanes &= ~lane;
}

export function lanesToSchedulerPriority(lanes: Lane): number {
	const lane = getHighestPriorityLane(lanes);

	if (lane === SyncLane) {
		return unstable_ImmediatePriority;
	}
	if (lane === InputContinuousLane) {
		return unstable_UserBlockingPriority;
	}
	if (lane === DefaultLane) {
		return unstable_NormalPriority;
	}

	return unstable_IdlePriority;
}

export function schedulerPriorityToLane(schedulerPriority: number) {
	if (schedulerPriority === unstable_ImmediatePriority) {
		return SyncLane;
	}
	if (schedulerPriority === unstable_UserBlockingPriority) {
		return InputContinuousLane;
	}
	if (schedulerPriority === unstable_NormalPriority) {
		return DefaultLane;
	}
	return IdleLane;
}
