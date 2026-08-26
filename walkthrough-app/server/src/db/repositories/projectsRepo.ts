import { randomUUID } from 'node:crypto';
import { db } from '../sqlite.js';
import type { Project, ProjectStatus } from '../../types.js';

interface ProjectRow {
  id: string;
  title: string;
  address: string | null;
  price_display: string | null;
  agent_name: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    address: row.address,
    priceDisplay: row.price_display,
    agentName: row.agent_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createProject(input: {
  title: string;
  address: string | null;
  priceDisplay: string | null;
  agentName: string | null;
}): Project {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO projects (id, title, address, price_display, agent_name) VALUES (?, ?, ?, ?, ?)`
  ).run(id, input.title, input.address, input.priceDisplay, input.agentName);
  return getProjectById(id)!;
}

export function listProjects(): Project[] {
  const rows = db.prepare(`SELECT * FROM projects ORDER BY created_at DESC`).all() as ProjectRow[];
  return rows.map(toProject);
}

export function getProjectById(id: string): Project | null {
  const row = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as ProjectRow | undefined;
  return row ? toProject(row) : null;
}

export function updateProject(
  id: string,
  input: Partial<{ title: string; address: string | null; priceDisplay: string | null; agentName: string | null; status: ProjectStatus }>
): Project | null {
  const existing = getProjectById(id);
  if (!existing) return null;

  db.prepare(
    `UPDATE projects SET title = ?, address = ?, price_display = ?, agent_name = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    input.title ?? existing.title,
    input.address !== undefined ? input.address : existing.address,
    input.priceDisplay !== undefined ? input.priceDisplay : existing.priceDisplay,
    input.agentName !== undefined ? input.agentName : existing.agentName,
    input.status ?? existing.status,
    id
  );
  return getProjectById(id);
}
