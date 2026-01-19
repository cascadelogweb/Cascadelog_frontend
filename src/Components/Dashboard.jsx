import React, { useState } from 'react';
import { 
  FiTarget, 
  FiActivity, 
  FiSettings, 
  FiTerminal, 
  FiImage, 
  FiLogOut,
  FiChevronRight,
  FiChevronLeft,
  FiUser
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Playground from '../Components/Playground'; // Import your new page component
import '../Styles/Dashboard.css';
import DailyActivity from './DailyActivity';
import Gallery from './Gallery';
import Consistency from './Consistency';
import Profile from './Profile';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('daily Activity');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { name: 'daily Activity', icon: <FiActivity /> },
    { name: 'playground', icon: <FiTerminal /> },
    { name: 'gallery', icon: <FiImage /> },
    { name: 'Consistency', icon: <FiTarget /> },
   { name: 'Profile', icon: <FiUser /> }
  ];

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userName');
    window.dispatchEvent(new Event("storage"));
    navigate('/auth');
  };

  // Helper function to render the correct component based on activeTab
  const renderContent = () => {
    switch (activeTab) {
        case 'playground':
            return <div style={{ height: '79vh', width: '79vw' }}><Playground /></div>
        case 'daily Activity':
            return  <DailyActivity />;
        case 'gallery':
            return  <Gallery />;
        case 'Consistency':
            return  <Consistency />;
        case 'Profile':
            return  <Profile />;
      default:
        return (
          <div className="Dash_card">
            <h3 style={{ textTransform: 'capitalize' }}>{activeTab}</h3>
            <p>This section is currently under development.</p>
          </div>
        );
    }
  };

  return (
    <div className={`Dash_container ${isCollapsed ? 'collapsed' : ''}`}>
      <aside className="Dash_sidebar">
              <div className="Dash_sidebarHeader">
                {!isCollapsed && (
                    <h2 className="Dash_logoText">
                    Cascade<span>Log</span>
                    </h2>
                )}
                
                <button 
                    className="Dash_toggleBtn" 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
                </button>
                </div>

        <nav className="Dash_nav">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`Dash_navItem ${activeTab === item.name ? 'Dash_active' : ''}`}
              onClick={() => setActiveTab(item.name)}
            >
              <span className="Dash_icon">{item.icon}</span>
              <span className="Dash_linkText">{item.name}</span>
              {activeTab === item.name && !isCollapsed && <FiChevronRight className="Dash_indicator" />}
            </button>
          ))}
          
          {/* <button className="Dash_logoutBtn" onClick={handleLogout}>
            <FiLogOut />
            <span className="Dash_linkText">Logout</span>
          </button> */}
        </nav>
      </aside>

      <main className="Dash_main">
        <section className="Dash_contentBody">
          {renderContent()}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;