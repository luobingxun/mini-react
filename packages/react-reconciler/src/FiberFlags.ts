export type Flags = number;

export const NoFlags = 0x00000001;
export const Placement = 0x00000010;
export const Update = 0x00000100;
export const ChildDeletion = 0x00001000;

export const MutationMask = Placement | Update | ChildDeletion;
