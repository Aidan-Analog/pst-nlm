import type { TransitionType } from '../types/prototype';

export const ENTER_CLASS: Record<TransitionType, string> = {
  none: '',
  fade: 'screen-enter-fade',
  'slide-left': 'screen-enter-slide-left',
  'slide-right': 'screen-enter-slide-right',
  'slide-up': 'screen-enter-slide-up',
  'slide-down': 'screen-enter-slide-down',
  scale: 'screen-enter-scale',
};

export const EXIT_CLASS: Record<TransitionType, string> = {
  none: '',
  fade: 'screen-exit-fade',
  'slide-left': 'screen-exit-slide-left',
  'slide-right': 'screen-exit-slide-right',
  'slide-up': 'screen-exit-slide-up',
  'slide-down': 'screen-exit-slide-down',
  scale: 'screen-exit-scale',
};

export const TRANSITION_LABELS: Record<TransitionType, string> = {
  none: 'None',
  fade: 'Fade',
  'slide-left': 'Slide Left',
  'slide-right': 'Slide Right',
  'slide-up': 'Slide Up',
  'slide-down': 'Slide Down',
  scale: 'Scale',
};
