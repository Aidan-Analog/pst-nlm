export interface ActivityCategory {
  id: string;
  label: string;
  items: string[];
}

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  {
    id: 'housework',
    label: 'Housework',
    items: [
      'Vacuumed',
      'Mopped floors',
      'Cleaned bathroom',
      'Cleaned kitchen',
      'Washed dishes',
      'Did laundry',
      'Folded laundry',
      'Took out trash',
      'Dusted',
      'Made beds',
    ],
  },
  {
    id: 'work',
    label: 'Work',
    items: [
      'Email/messages',
      'Meetings/calls',
      'Deep work',
      'Admin tasks',
      'Planning/organizing',
      'Research/learning',
      'Code/writing/design',
    ],
  },
  {
    id: 'otherChores',
    label: 'Other Chores',
    items: [
      'Groceries/shopping',
      'Cooking/meal prep',
      'Yard work',
      'Exercise/workout',
      'Errands',
      'Pet care',
    ],
  },
];
