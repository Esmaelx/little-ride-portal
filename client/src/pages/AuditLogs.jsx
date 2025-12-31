import { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import {
    ClipboardList,
    Filter,
    Calendar,
    ChevronLeft,
    ChevronRight,
    User,
    Car,
    FileText,
    Settings
} from 'lucide-react';
import './AuditLogs.css';

function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        action: '',
        entityType: '',
        startDate: '',
        endDate: '',
        page: 1
    });

    useEffect(() => {
        fetchLogs();
    }, [filters]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = {
                page: filters.page,
                limit: 30
            };
            if (filters.action) params.action = filters.action;
            if (filters.entityType) params.entityType = filters.entityType;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;

            const response = await auditAPI.getAll(params);
            setLogs(response.data.data);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEntityIcon = (type) => {
        switch (type) {
            case 'user': return <User size={16} />;
            case 'driver': return <Car size={16} />;
            case 'document': return <FileText size={16} />;
            default: return <Settings size={16} />;
        }
    };

    const getActionClass = (action) => {
        if (['create', 'approve'].includes(action)) return 'action-success';
        if (['delete', 'reject'].includes(action)) return 'action-danger';
        if (['login', 'logout'].includes(action)) return 'action-info';
        return 'action-default';
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="audit-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Audit Logs</h1>
                    <p className="page-subtitle">System activity and change history</p>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="filter-group">
                    <Filter size={18} className="text-muted" />
                    <select
                        className="form-input filter-select"
                        value={filters.action}
                        onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value, page: 1 }))}
                    >
                        <option value="">All Actions</option>
                        <option value="create">Create</option>
                        <option value="update">Update</option>
                        <option value="delete">Delete</option>
                        <option value="approve">Approve</option>
                        <option value="reject">Reject</option>
                        <option value="login">Login</option>
                        <option value="logout">Logout</option>
                    </select>
                </div>

                <div className="filter-group">
                    <select
                        className="form-input filter-select"
                        value={filters.entityType}
                        onChange={(e) => setFilters(prev => ({ ...prev, entityType: e.target.value, page: 1 }))}
                    >
                        <option value="">All Entities</option>
                        <option value="user">Users</option>
                        <option value="driver">Drivers</option>
                        <option value="document">Documents</option>
                    </select>
                </div>

                <div className="filter-group">
                    <Calendar size={18} className="text-muted" />
                    <input
                        type="date"
                        className="form-input filter-date"
                        value={filters.startDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
                    />
                    <span className="text-muted">to</span>
                    <input
                        type="date"
                        className="form-input filter-date"
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
                    />
                </div>
            </div>

            {/* Logs List */}
            <div className="card">
                {loading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                    </div>
                ) : logs.length > 0 ? (
                    <>
                        <div className="logs-list">
                            {logs.map(log => (
                                <div key={log._id} className="log-item">
                                    <div className="log-icon">
                                        {getEntityIcon(log.entityType)}
                                    </div>
                                    <div className="log-content">
                                        <div className="log-description">{log.description}</div>
                                        <div className="log-meta">
                                            <span className={`log-action ${getActionClass(log.action)}`}>
                                                {log.action}
                                            </span>
                                            <span className="log-user">
                                                by {log.performedByName}
                                            </span>
                                            <span className="log-role">
                                                ({log.performedByRole})
                                            </span>
                                        </div>
                                    </div>
                                    <div className="log-time">
                                        {formatDate(log.createdAt)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {pagination.pages > 1 && (
                            <div className="pagination">
                                <button
                                    className="btn btn-ghost btn-sm"
                                    disabled={filters.page === 1}
                                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="pagination-info">
                                    Page {filters.page} of {pagination.pages}
                                </span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    disabled={filters.page === pagination.pages}
                                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="card-body">
                        <div className="empty-state">
                            <ClipboardList size={48} className="empty-state-icon" />
                            <h4 className="empty-state-title">No logs found</h4>
                            <p className="empty-state-text">
                                Activity logs will appear here as users interact with the system
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AuditLogs;
