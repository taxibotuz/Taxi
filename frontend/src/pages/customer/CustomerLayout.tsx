import { Outlet } from 'react-router-dom';
import BottomNav from '../../components/ui/BottomNav';

export default function CustomerLayout() {
  return (
    <div className="h-full flex flex-col bg-[#0a0a1a]">
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
