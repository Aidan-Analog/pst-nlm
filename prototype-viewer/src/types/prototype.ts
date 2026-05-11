export type TransitionType =
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'scale';

export type Easing = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';

export type AnimationType =
  | 'fade-in'
  | 'slide-in-left'
  | 'slide-in-right'
  | 'slide-in-up'
  | 'slide-in-down'
  | 'scale-in'
  | 'pulse'
  | 'bounce';

export type MicroTrigger = 'on-enter' | 'on-hover' | 'on-click';

export type EditMode = 'select' | 'hotspot' | 'micro';

/** All coords are percentages of canvas dimensions (0–100) */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transition {
  type: TransitionType;
  duration: number;
  easing: Easing;
}

export interface Hotspot {
  id: string;
  rect: Rect;
  targetScreenId: string;
  transition: Transition;
}

export interface MicroInteraction {
  id: string;
  rect: Rect;
  animation: AnimationType;
  trigger: MicroTrigger;
  delay: number;
  duration: number;
  easing: Easing;
  iterationCount: number | 'infinite';
}

export interface ProtoScreen {
  id: string;
  name: string;
  imageDataUrl: string;
  hotspots: Hotspot[];
  microInteractions: MicroInteraction[];
  enterTransition: Transition;
}

export interface PrototypeState {
  screens: ProtoScreen[];
  activeScreenId: string | null;
  selectedHotspotId: string | null;
  selectedMicroId: string | null;
  editMode: EditMode;
}

export const DEFAULT_TRANSITION: Transition = {
  type: 'fade',
  duration: 300,
  easing: 'ease',
};
