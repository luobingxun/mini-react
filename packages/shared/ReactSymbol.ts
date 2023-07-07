const surportSymbol = typeof Symbol === 'function' && Symbol.for;

export const REACT_ELEMENT_TYPE = surportSymbol
	? Symbol.for('react.element')
	: 0xeac7;
