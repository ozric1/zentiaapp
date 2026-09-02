import React from 'react';

interface SidebarProps {
    currentLesson: number;
    onSelectLesson: (id: number) => void;
    completedLessons?: number[];
}

const Sidebar: React.FC<SidebarProps> = ({ currentLesson, onSelectLesson, completedLessons = [] }) => {
    
    const NavItem = ({ id, icon, label, isCheck }: { id: number; icon: string; label: string; isCheck?: boolean }) => {
        const isCompleted = completedLessons.includes(id);
        const isActive = currentLesson === id;

        return (
            <div 
                onClick={() => onSelectLesson(id)}
                className={`
                    px-4 py-3 rounded-md cursor-pointer transition-all duration-200 flex items-center gap-3 mb-1 text-sm
                    ${isActive 
                        ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-900/50' 
                        : isCheck 
                            ? 'text-amber-400 hover:bg-slate-800 hover:text-amber-300 font-medium' 
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                `}
            >
                <i className={`${icon} w-5 text-center ${isCheck && !isCompleted ? 'animate-pulse' : ''}`}></i>
                <span className="truncate flex-1">{label}</span>
                {isCompleted && (
                    <i className="fa-solid fa-circle-check text-green-400 text-xs ml-auto shrink-0" title="Completed"></i>
                )}
            </div>
        );
    };

    const GroupTitle = ({ title }: { title: string }) => (
        <div className="text-[0.65rem] uppercase tracking-wider font-bold text-slate-500 mt-6 mb-2 ml-4">
            {title}
        </div>
    );

    return (
        <div className="w-full md:w-64 bg-slate-900 flex flex-col h-full border-r border-slate-800">
            {/* Header */}
            <div className="p-6 flex items-center gap-4 text-white border-b border-slate-800 shrink-0">
                {/* Zentia World Logo */}
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 shadow-lg relative overflow-hidden group shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-800 to-slate-700 opacity-50"></div>
                    <span className="font-serif text-2xl text-white font-bold italic relative z-10" style={{ fontFamily: 'Playfair Display' }}>Z</span>
                </div>
                <div>
                    <h1 className="font-bold text-base tracking-wide leading-tight font-serif text-white" style={{ fontFamily: 'Playfair Display' }}>Zentia World</h1>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">Master Corporate Presence</p>
                </div>
            </div>

            {/* Scrollable Nav */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                <NavItem id={0} icon="fa-solid fa-circle-info" label="Course Intro" />

                <GroupTitle title="Module 1: Foundations" />
                <NavItem id={1} icon="fa-solid fa-handshake" label="1. First Impressions" />
                <NavItem id={2} icon="fa-solid fa-rocket" label="2. Motivation" />
                <NavItem id={3} icon="fa-solid fa-gavel" label="3. Negotiation" />
                <NavItem id={101} icon="fa-solid fa-list-check" label="Progress Check 1" isCheck={true} />

                <GroupTitle title="Module 2: Strategy" />
                <NavItem id={4} icon="fa-solid fa-lightbulb" label="4. Pitching Innovation" />
                <NavItem id={5} icon="fa-solid fa-scale-balanced" label="5. Client Diplomacy" />
                <NavItem id={6} icon="fa-solid fa-leaf" label="6. Ethical Persuasion" />
                <NavItem id={102} icon="fa-solid fa-list-check" label="Progress Check 2" isCheck={true} />

                <GroupTitle title="Module 3: Operations" />
                <NavItem id={7} icon="fa-solid fa-chess" label="7. Strategic Decisions" />
                <NavItem id={8} icon="fa-solid fa-globe" label="8. Outsourcing" />
                <NavItem id={103} icon="fa-solid fa-list-check" label="Progress Check 3" isCheck={true} />

                <GroupTitle title="Module 4: Development" />
                <NavItem id={9} icon="fa-solid fa-list-check" label="9. Project Mastery" />
                <NavItem id={10} icon="fa-solid fa-network-wired" label="10. Networking" />
                <NavItem id={11} icon="fa-solid fa-video" label="11. Virtual Comm." />
                <NavItem id={12} icon="fa-solid fa-arrow-trend-up" label="12. Leading Change" />
                <NavItem id={104} icon="fa-solid fa-list-check" label="Progress Check 4" isCheck={true} />

                <GroupTitle title="Module 5: Management" />
                <NavItem id={13} icon="fa-solid fa-chart-pie" label="13. Data Storytelling" />
                <NavItem id={14} icon="fa-solid fa-earth-americas" label="14. Cross-Cultural" />
                <NavItem id={15} icon="fa-solid fa-user-check" label="15. Feedback" />
                <NavItem id={105} icon="fa-solid fa-list-check" label="Progress Check 5" isCheck={true} />
                
                <div className="h-12"></div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 text-[10px] text-center text-slate-600 shrink-0">
                Zentia World Suite v3.1
            </div>
        </div>
    );
};

export default Sidebar;