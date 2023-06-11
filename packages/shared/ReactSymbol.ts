const surportSymbol = typeof Symbol.for === 'function' && Symbol.for;

export const REACT_ELEMENT = surportSymbol
	? Symbol.for('react.element')
	: 0xeac1;
