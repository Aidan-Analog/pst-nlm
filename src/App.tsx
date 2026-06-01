import SetlistView from './pages/SetlistView';
import SetlistAdmin from './pages/SetlistAdmin';

export default function App() {
  const path = window.location.pathname;
  if (path === '/setlist/admin') return <SetlistAdmin />;
  return <SetlistView />;
}
