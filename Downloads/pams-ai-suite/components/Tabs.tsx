import React from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  onTabChange?: () => void;
  className?: string;
  tabClassName?: string;
  activeTabClassName?: string;
  inactiveTabClassName?: string;
}

const Tabs: React.FC<TabsProps> = ({ 
    tabs, activeTab, setActiveTab, onTabChange,
    className = "flex bg-gray-200 rounded-t-lg",
    tabClassName = "flex-1 py-3 px-4 text-center text-sm sm:text-base font-medium transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2",
    activeTabClassName = "bg-white text-blue-600 shadow-md",
    inactiveTabClassName = "bg-gray-200 text-gray-600 hover:bg-gray-300"
}) => {
  const handleTabClick = (tabId: string) => {
    if(tabId !== activeTab) {
      setActiveTab(tabId);
      if (onTabChange) {
        onTabChange();
      }
    }
  };

  const getTabClass = (tabId: string) => {
    if (tabId === activeTab) {
      return `${tabClassName} ${activeTabClassName}`;
    }
    return `${tabClassName} ${inactiveTabClassName}`;
  };

  return (
    <div className={className}>
      {tabs.map(tab => (
        <button key={tab.id} className={`${getTabClass(tab.id)} rounded-t-lg`} onClick={() => handleTabClick(tab.id)}>
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
