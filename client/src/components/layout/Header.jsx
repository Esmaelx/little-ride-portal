import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Bell, Menu, User, Settings, ChevronDown } from 'lucide-react';
import './Header.css';

function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <header className="header">
            <div className="header-left">
                <button
                    className="btn btn-icon btn-ghost menu-toggle"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    <Menu size={20} />
                </button>
                <div className="header-greeting">
                    <span className="greeting-text">{getGreeting()},</span>
                    <span className="greeting-name">{user?.name?.split(' ')[0]}</span>
                </div>
            </div>

            <div className="header-right">
                <button className="btn btn-icon btn-ghost notification-btn">
                    <Bell size={20} />
                    <span className="notification-dot"></span>
                </button>

                <div className="user-dropdown">
                    <button
                        className="dropdown-trigger"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        <div className="user-avatar-sm">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <ChevronDown size={16} />
                    </button>

                    {showDropdown && (
                        <>
                            <div
                                className="dropdown-overlay"
                                onClick={() => setShowDropdown(false)}
                            ></div>
                            <div className="dropdown-menu">
                                <div className="dropdown-header">
                                    <span className="dropdown-name">{user?.name}</span>
                                    <span className="dropdown-email">{user?.email}</span>
                                </div>
                                <div className="dropdown-divider"></div>
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        setShowDropdown(false);
                                        navigate('/settings');
                                    }}
                                >
                                    <Settings size={16} />
                                    Settings
                                </button>
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        setShowDropdown(false);
                                        navigate('/profile');
                                    }}
                                >
                                    <User size={16} />
                                    Profile
                                </button>
                                <div className="dropdown-divider"></div>
                                <button
                                    className="dropdown-item danger"
                                    onClick={handleLogout}
                                >
                                    <LogOut size={16} />
                                    Sign out
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Header;
