import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    Car,
    FileCheck,
    UserPlus,
    ClipboardList,
    Settings,
    Shield
} from 'lucide-react';
import './Sidebar.css';

function Sidebar() {
    const { user, isAdmin, isOperations } = useAuth();
    const location = useLocation();

    const navItems = [
        {
            label: 'Dashboard',
            path: '/dashboard',
            icon: LayoutDashboard,
            roles: ['sales_agent', 'operations', 'admin']
        },
        {
            label: 'My Drivers',
            path: '/drivers',
            icon: Car,
            roles: ['sales_agent', 'operations', 'admin']
        },
        {
            label: 'Register Driver',
            path: '/drivers/new',
            icon: UserPlus,
            roles: ['sales_agent']
        },
        {
            label: 'Approval Queue',
            path: '/approvals',
            icon: FileCheck,
            roles: ['operations', 'admin']
        },
        {
            label: 'User Management',
            path: '/users',
            icon: Users,
            roles: ['admin']
        },
        {
            label: 'Audit Logs',
            path: '/audit',
            icon: ClipboardList,
            roles: ['admin']
        }
    ];

    const filteredNavItems = navItems.filter(item =>
        item.roles.includes(user?.role)
    );

    const getRoleBadge = (role) => {
        const labels = {
            admin: 'Administrator',
            operations: 'Operations',
            sales_agent: 'Sales Agent'
        };
        return labels[role] || role;
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <Shield size={32} />
                    <div className="logo-text">
                        <span className="logo-title">Little-Ride</span>
                        <span className="logo-subtitle">Internal Portal</span>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                <ul className="nav-list">
                    {filteredNavItems.map(item => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `nav-item ${isActive ? 'active' : ''}`
                                }
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="user-details">
                        <span className="user-name">{user?.name}</span>
                        <span className="user-role">{getRoleBadge(user?.role)}</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
