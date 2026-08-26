import { Navigate, Route, Routes } from 'react-router-dom';
import { ProjectListScreen } from './components/ProjectListScreen';
import { UploadScreen } from './components/upload/UploadScreen';
import { ReorderScreen } from './components/reorder/ReorderScreen';
import { RenderOptionsForm } from './components/render/RenderOptionsForm';
import { RenderProgressScreen } from './components/render/RenderProgressScreen';
import { PreviewScreen } from './components/preview/PreviewScreen';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListScreen />} />
      <Route path="/projects/:id/upload" element={<UploadScreen />} />
      <Route path="/projects/:id/reorder" element={<ReorderScreen />} />
      <Route path="/projects/:id/render" element={<RenderOptionsForm />} />
      <Route path="/projects/:id/progress/:jobId" element={<RenderProgressScreen />} />
      <Route path="/projects/:id/preview" element={<PreviewScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
