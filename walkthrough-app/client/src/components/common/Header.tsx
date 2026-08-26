import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-lg font-semibold tracking-tight text-slate-900">
          Walkthrough Generator
        </Link>
        <span className="text-xs text-slate-400">Photos in, video out</span>
      </div>
    </header>
  );
}
