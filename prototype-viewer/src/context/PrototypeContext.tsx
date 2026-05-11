import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  PrototypeState,
  ProtoScreen,
  Hotspot,
  MicroInteraction,
  Transition,
  EditMode,
} from '../types/prototype';
import { DEFAULT_TRANSITION } from '../types/prototype';
import { saveState, loadState } from '../utils/storage';

type Action =
  | { type: 'ADD_SCREENS'; screens: ProtoScreen[] }
  | { type: 'REMOVE_SCREEN'; id: string }
  | { type: 'REORDER_SCREENS'; fromIndex: number; toIndex: number }
  | { type: 'SET_ACTIVE_SCREEN'; id: string }
  | { type: 'SET_EDIT_MODE'; mode: EditMode }
  | { type: 'ADD_HOTSPOT'; screenId: string; hotspot: Hotspot }
  | { type: 'UPDATE_HOTSPOT'; screenId: string; hotspot: Hotspot }
  | { type: 'DELETE_HOTSPOT'; screenId: string; hotspotId: string }
  | { type: 'SELECT_HOTSPOT'; id: string }
  | { type: 'ADD_MICRO'; screenId: string; micro: MicroInteraction }
  | { type: 'UPDATE_MICRO'; screenId: string; micro: MicroInteraction }
  | { type: 'DELETE_MICRO'; screenId: string; microId: string }
  | { type: 'SELECT_MICRO'; id: string }
  | { type: 'DESELECT' }
  | { type: 'UPDATE_SCREEN_TRANSITION'; screenId: string; transition: Transition }
  | { type: 'RENAME_SCREEN'; screenId: string; name: string }
  | { type: 'LOAD_STATE'; state: PrototypeState };

const INITIAL_STATE: PrototypeState = {
  screens: [],
  activeScreenId: null,
  selectedHotspotId: null,
  selectedMicroId: null,
  editMode: 'select',
};

function reducer(state: PrototypeState, action: Action): PrototypeState {
  switch (action.type) {
    case 'ADD_SCREENS': {
      const screens = [...state.screens, ...action.screens];
      return {
        ...state,
        screens,
        activeScreenId: state.activeScreenId ?? screens[0]?.id ?? null,
      };
    }
    case 'REMOVE_SCREEN': {
      const screens = state.screens.filter((s) => s.id !== action.id);
      const activeScreenId =
        state.activeScreenId === action.id ? (screens[0]?.id ?? null) : state.activeScreenId;
      return { ...state, screens, activeScreenId };
    }
    case 'REORDER_SCREENS': {
      const screens = [...state.screens];
      const [moved] = screens.splice(action.fromIndex, 1);
      screens.splice(action.toIndex, 0, moved);
      return { ...state, screens };
    }
    case 'SET_ACTIVE_SCREEN':
      return { ...state, activeScreenId: action.id, selectedHotspotId: null, selectedMicroId: null };
    case 'SET_EDIT_MODE':
      return { ...state, editMode: action.mode, selectedHotspotId: null, selectedMicroId: null };
    case 'ADD_HOTSPOT':
      return {
        ...state,
        screens: state.screens.map((s) =>
          s.id === action.screenId ? { ...s, hotspots: [...s.hotspots, action.hotspot] } : s
        ),
        selectedHotspotId: action.hotspot.id,
      };
    case 'UPDATE_HOTSPOT':
      return {
        ...state,
        screens: state.screens.map((s) =>
          s.id === action.screenId
            ? { ...s, hotspots: s.hotspots.map((h) => (h.id === action.hotspot.id ? action.hotspot : h)) }
            : s
        ),
      };
    case 'DELETE_HOTSPOT':
      return {
        ...state,
        screens: state.screens.map((s) =>
          s.id === action.screenId
            ? { ...s, hotspots: s.hotspots.filter((h) => h.id !== action.hotspotId) }
            : s
        ),
        selectedHotspotId: null,
      };
    case 'SELECT_HOTSPOT':
      return { ...state, selectedHotspotId: action.id, selectedMicroId: null };
    case 'ADD_MICRO':
      return {
        ...state,
        screens: state.screens.map((s) =>
          s.id === action.screenId
            ? { ...s, microInteractions: [...s.microInteractions, action.micro] }
            : s
        ),
        selectedMicroId: action.micro.id,
      };
    case 'UPDATE_MICRO':
      return {
        ...state,
        screens: state.screens.map((s) =>
          s.id === action.screenId
            ? {
                ...s,
                microInteractions: s.microInteractions.map((m) =>
                  m.id === action.micro.id ? action.micro : m
                ),
              }
            : s
        ),
      };
    case 'DELETE_MICRO':
      return {
        ...state,
        screens: state.screens.map((s) =>
          s.id === action.screenId
            ? { ...s, microInteractions: s.microInteractions.filter((m) => m.id !== action.microId) }
            : s
        ),
        selectedMicroId: null,
      };
    case 'SELECT_MICRO':
      return { ...state, selectedMicroId: action.id, selectedHotspotId: null };
    case 'DESELECT':
      return { ...state, selectedHotspotId: null, selectedMicroId: null };
    case 'UPDATE_SCREEN_TRANSITION':
      return {
        ...state,
        screens: state.screens.map((s) =>
          s.id === action.screenId ? { ...s, enterTransition: action.transition } : s
        ),
      };
    case 'RENAME_SCREEN':
      return {
        ...state,
        screens: state.screens.map((s) =>
          s.id === action.screenId ? { ...s, name: action.name } : s
        ),
      };
    case 'LOAD_STATE':
      return action.state;
    default:
      return state;
  }
}

interface ContextValue {
  state: PrototypeState;
  dispatch: React.Dispatch<Action>;
  activeScreen: ProtoScreen | null;
  addScreensFromFiles: (files: File[]) => Promise<void>;
}

const Ctx = createContext<ContextValue | null>(null);

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, () => {
    return loadState() ?? INITIAL_STATE;
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const activeScreen = state.screens.find((s) => s.id === state.activeScreenId) ?? null;

  const addScreensFromFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    const screens: ProtoScreen[] = await Promise.all(
      imageFiles.map(
        (file) =>
          new Promise<ProtoScreen>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target!.result as string;
              // Compress image via canvas to keep localStorage usage manageable
              const img = new Image();
              img.onload = () => {
                const MAX = 1280;
                const scale = img.width > MAX ? MAX / img.width : 1;
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve({
                  id: crypto.randomUUID(),
                  name: file.name.replace(/\.[^.]+$/, ''),
                  imageDataUrl: dataUrl,
                  hotspots: [],
                  microInteractions: [],
                  enterTransition: { ...DEFAULT_TRANSITION },
                });
              };
              img.src = src;
            };
            reader.readAsDataURL(file);
          })
      )
    );
    dispatch({ type: 'ADD_SCREENS', screens });
  }, []);

  return <Ctx.Provider value={{ state, dispatch, activeScreen, addScreensFromFiles }}>{children}</Ctx.Provider>;
}

export function usePrototype(): ContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrototype must be used within PrototypeProvider');
  return ctx;
}
