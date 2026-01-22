import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../Components/Auth/supabaseClient'; // Ensure this path is correct

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false); 
    const navigate = useNavigate();
    
    const dropdownRef = useRef(null);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const toggleUserDropdown = () => setIsUserDropdownOpen(!isUserDropdownOpen);

    const handleAuthClick = (mode) => {
        setIsUserDropdownOpen(false); 
        navigate('/auth', { state: { mode } }); 
    };

    // 1. Unified Auth Listener (Supabase + LocalStorage)
    useEffect(() => {
        // Sync with Supabase Session directly
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                setIsLoggedIn(true);
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userName', session.user.user_metadata.full_name || 'User');
            } else {
                setIsLoggedIn(false);
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userName');
            }
        });

        // Backup listener for manual storage events
        const checkAuth = () => {
            const authStatus = localStorage.getItem('isLoggedIn') === 'true';
            setIsLoggedIn(authStatus);
        };

        window.addEventListener('storage', checkAuth);
        
        return () => {
            subscription.unsubscribe();
            window.removeEventListener('storage', checkAuth);
        };
    }, []);

    // 2. Click Outside to Close Logic
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsUserDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isUserDropdownOpen]);

    const handleLogout = async () => {
        // Sign out from Supabase
        await supabase.auth.signOut();
        
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userName');
        setIsLoggedIn(false);
        setIsUserDropdownOpen(false);
        navigate('/'); 
    };

    return (
        <nav className="home_navbar">
            <div className="home_navbar-container">
                <div className="home-navbar_flex" onClick={() => navigate('/')} style={{cursor: 'pointer'}}>
                    <div className="home_nav-logo">
                        <LogoSVG/>
                    </div>
                    <span className="home_logo-text">CascadeLog</span>
                </div>

                <button className="home_menu-toggle" onClick={toggleMenu}>
                    <span className="home_bar"></span>
                    <span className="home_bar"></span>
                    <span className="home_bar"></span>
                </button>

                <ul className={`home_nav-elements ${isMenuOpen ? 'home_active' : ''}`}>
                    <li><Link to="/" className="home_nav-link">Home</Link></li>
                    <li><Link to="/about" className="home_nav-link">About</Link></li>
                    {/* Dashboard only visible if logged in */}
                    {isLoggedIn && (<li><Link to="/dashboard" className="home_nav-link"> Dashboard</Link>  </li> )}
                </ul>

                <div className="home_login-utils">
                    {isLoggedIn && (
                        <span id="home_username">
                            {localStorage.getItem('userName') || 'User'}
                        </span>
                    )}
                    
                    <div className="home_user-wrapper" ref={dropdownRef}>
                        <div className="home_user-icon" onClick={toggleUserDropdown}>
                            <svg viewBox="0 0 24 24" fill="white" width="30" height="30">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                        </div>

                        {isUserDropdownOpen && (
                            <div className="home_dropdown-menu">
                                {!isLoggedIn ? (
                                    <>
                                        <button className="dropdown-item" onClick={() => handleAuthClick('signin')}>Sign In</button>
                                        <button className="dropdown-item" onClick={() => handleAuthClick('signup')}>Sign Up</button>
                                    </>
                                ) : (
                                    <button className="dropdown-item logout" onClick={handleLogout}>Logout</button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

export function LogoSVG() {
    return (
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
            <path d="M85 40 C70 40, 70 40, 70 55 L70 75 C70 85, 60 85, 60 90 C60 95, 70 95, 70 105 L70 125 C70 140, 70 140, 85 140" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M115 40 C130 40, 130 40, 130 55 L130 75 C130 85, 140 85, 140 90 C140 95, 130 95, 130 105 L130 125 C130 140, 130 140, 115 140" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <g stroke="#FFF0B3" strokeWidth="5" strokeLinecap="round">
                <line x1="85" y1="58" x2="115" y2="58" />
                <line x1="80" y1="74" x2="120" y2="74" />
                <line x1="80" y1="90" x2="120" y2="90" />
                <line x1="80" y1="106" x2="120" y2="106" />
                <line x1="85" y1="122" x2="115" y2="122" />
            </g>
        </svg>
    );

}
