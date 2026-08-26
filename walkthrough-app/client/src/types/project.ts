export type ProjectStatus = 'draft' | 'rendering' | 'ready';

export interface Project {
  id: string;
  title: string;
  address: string | null;
  priceDisplay: string | null;
  agentName: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}
