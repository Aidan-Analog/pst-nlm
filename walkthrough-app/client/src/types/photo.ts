export interface Photo {
  id: string;
  projectId: string;
  orderIndex: number;
  roomLabel: string | null;
  originalFilename: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  url: string;
  thumbnailUrl: string;
}
