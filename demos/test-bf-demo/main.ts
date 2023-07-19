import './styles.css';
import {
	unstable_ImmediatePriority as ImmediatePriority,
	unstable_UserBlockingPriority as UserBlockingPriority,
	unstable_NormalPriority as NormalPriority,
	unstable_LowPriority as LowPriority,
	unstable_IdlePriority as IdlePriority,
	unstable_scheduleCallback as scheduleCallback,
	unstable_cancelCallback as cancelCallback,
	unstable_getFirstCallbackNode as getFirstCallbackNode,
	CallbackNode
} from 'scheduler';

const root = document.querySelector('#root');

type Priority =
	| typeof ImmediatePriority
	| typeof UserBlockingPriority
	| typeof NormalPriority
	| typeof LowPriority
	| typeof IdlePriority;

interface Work {
	count: number;
	priority: Priority;
}

const workList: Work[] = [];
let currCallback: CallbackNode | null = null;
let prevPriority: Priority = IdlePriority;
let cbNode: CallbackNode | null = null;

function schedule() {
	cbNode = getFirstCallbackNode();
	const currWork = workList.sort((a, b) => a.priority - b.priority)[0];

	if (!currWork) {
		currCallback = null;
		cbNode && cancelCallback(cbNode);
		return;
	}

	const { priority: currPriority } = currWork;
	if (currPriority === prevPriority) {
		return;
	}

	cbNode && cancelCallback(cbNode);

	currCallback = scheduleCallback(currPriority, perform.bind(null, currWork));
}

function perform(work: Work, didTimeout: boolean) {
	/*
    1.优先级
    2.饥饿问题
    3....
  */
	const needAync = work.priority === ImmediatePriority || didTimeout;
	while ((needAync || !didTimeout) && work.count) {
		insertSpan(work.priority + '');
		work.count--;
	}

	prevPriority = work.priority;
	if (!work.count) {
		const index = workList.findIndex((w) => w.priority == work.priority);
		workList.splice(index, 1);
		prevPriority = IdlePriority;
	}

	const prevCallback = currCallback;
	schedule();
	const nextCallback = currCallback;

	if (nextCallback && nextCallback === prevCallback) {
		return perform.bind(null, work);
	}
}

function insertSpan(content: string) {
	const span = document.createElement('span');
	span.innerText = content;
	span.className = 'pri-' + content;
	sleep(10000000);
	root?.appendChild(span);
}

[ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority].forEach(
	(priority) => {
		const btn = document.createElement('button');
		btn.onclick = () => {
			workList.push({
				count: 100,
				priority
			} as Work);
			schedule();
		};
		btn.innerText = [
			'ImmediatePriority',
			'UserBlockingPriority',
			'NormalPriority',
			'LowPriority'
		][priority - 1];
		root?.appendChild(btn);
	}
);

function sleep(time: number) {
	while (time > 0) {
		time--;
	}
}
