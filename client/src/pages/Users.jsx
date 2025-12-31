import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import {
    Users as UsersIcon,
    Plus,
    Search,
    Edit,
    Trash2,
    Key,
    X,
    Loader,
    Shield,
    UserCheck,
    Briefcase
} from 'lucide-react';
import './Users.css';

function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'sales_agent',
        phone: ''
    });
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUsers();
    }, [search, roleFilter]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = {};
            if (search) params.search = search;
            if (roleFilter) params.role = roleFilter;

            const response = await usersAPI.getAll(params);
            setUsers(response.data.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'sales_agent',
            phone: ''
        });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            phone: user.phone || ''
        });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setProcessing(true);

        try {
            if (editingUser) {
                await usersAPI.update(editingUser._id, {
                    name: formData.name,
                    role: formData.role,
                    phone: formData.phone
                });
            } else {
                if (!formData.password || formData.password.length < 6) {
                    setError('Password must be at least 6 characters');
                    setProcessing(false);
                    return;
                }
                await usersAPI.create(formData);
            }
            setShowModal(false);
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Error saving user');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (user) => {
        if (!confirm(`Are you sure you want to deactivate ${user.name}?`)) return;

        try {
            await usersAPI.delete(user._id);
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const handleResetPassword = async (user) => {
        const newPassword = prompt('Enter new password (min 6 characters):');
        if (!newPassword || newPassword.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }

        try {
            await usersAPI.resetPassword(user._id, { password: newPassword });
            alert('Password reset successfully');
        } catch (error) {
            console.error('Error resetting password:', error);
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'admin': return <Shield size={16} />;
            case 'operations': return <Briefcase size={16} />;
            default: return <UserCheck size={16} />;
        }
    };

    const getRoleLabel = (role) => {
        const labels = {
            admin: 'Administrator',
            operations: 'Operations Officer',
            sales_agent: 'Sales Agent'
        };
        return labels[role] || role;
    };

    return (
        <div className="users-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">Manage portal users and their roles</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} />
                    Add User
                </button>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-input-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        className="form-input search-input"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="form-input filter-select"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                >
                    <option value="">All Roles</option>
                    <option value="admin">Administrator</option>
                    <option value="operations">Operations Officer</option>
                    <option value="sales_agent">Sales Agent</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="card">
                {loading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                    </div>
                ) : users.length > 0 ? (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Last Login</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user._id}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar">
                                                    {user.name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="user-name">{user.name}</div>
                                                    <div className="user-email text-muted text-sm">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`role-badge role-${user.role}`}>
                                                {getRoleIcon(user.role)}
                                                {getRoleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-dot ${user.isActive ? 'active' : 'inactive'}`}>
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="text-muted text-sm">
                                            {user.lastLogin
                                                ? new Date(user.lastLogin).toLocaleString()
                                                : 'Never'}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn btn-ghost btn-sm btn-icon"
                                                    title="Edit User"
                                                    onClick={() => openEditModal(user)}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm btn-icon"
                                                    title="Reset Password"
                                                    onClick={() => handleResetPassword(user)}
                                                >
                                                    <Key size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm btn-icon text-danger"
                                                    title="Deactivate User"
                                                    onClick={() => handleDelete(user)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="card-body">
                        <div className="empty-state">
                            <UsersIcon size={48} className="empty-state-icon" />
                            <h4 className="empty-state-title">No users found</h4>
                            <p className="empty-state-text">
                                Add your first team member to get started
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* User Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingUser ? 'Edit User' : 'Create New User'}</h3>
                            <button
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => setShowModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {error && (
                                    <div className="form-error-banner mb-4">{error}</div>
                                )}

                                <div className="form-group">
                                    <label className="form-label required">Full Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        disabled={!!editingUser}
                                        required
                                    />
                                </div>

                                {!editingUser && (
                                    <div className="form-group">
                                        <label className="form-label required">Password</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            value={formData.password}
                                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="Min 6 characters"
                                            required
                                        />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label required">Role</label>
                                    <select
                                        className="form-input"
                                        value={formData.role}
                                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                                    >
                                        <option value="sales_agent">Sales Agent</option>
                                        <option value="operations">Operations Officer</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="+251 9XX XXX XXX"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={processing}
                                >
                                    {processing ? <Loader size={16} className="spin" /> : null}
                                    {editingUser ? 'Save Changes' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Users;
