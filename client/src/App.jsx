import React from 'react';
import TopNavBar from './components/TopNavBar';
import CourseSidebar from './components/CourseSidebar';
import ScheduleGrid from './components/ScheduleGrid';
import BottomNavBar from './components/BottomNavBar';
import { SelectionProvider } from './hooks/useSelection';

export default function App() {
  return (
    <SelectionProvider>
      <div className="w-screen h-screen flex flex-col bg-[#FCF8FF] text-[#1B1B24] font-['Inter',sans-serif] overflow-hidden">
        {/* 1. Header (64px) */}
        <TopNavBar />

        {/* 2. Main Content Area */}
        <main className="flex-1 flex flex-row overflow-hidden relative">
          <CourseSidebar />
          <ScheduleGrid />
        </main>

        {/* 3. Footer (60px) */}
        <BottomNavBar />
      </div>
    </SelectionProvider>
  );
}