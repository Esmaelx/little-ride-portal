import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { driversAPI } from '../services/api';
import {
    Search,
    Filter,
    Plus,
    Car,
    Eye,
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    Loader
} from 'lucide-react';
import './Drivers.css';

const REJECTION_REASONS = [
    'Missing documents',
    'Invalid documents',
    'Information does not match',
    'Expired documents',
    'Failed verification',
    'Other'
];

function Drivers() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [drivers, setDrivers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const [filters, setFilters] = useState({
        status: searchParams.get('status') || 'all',
        search: searchParams.get('search') || '',
        page: parseInt(searchParams.get('page')) || 1
    });

    // Rejection modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [customReason, setCustomReason] = useState('');

    const isOperationsOrAdmin = user.role === 'operations' || user.role === 'admin';
    const isSalesAgent = user.role === 'sales_agent';

    useEffect(() => {
        fetchDrivers();
    }, [filters]);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const params = {
                page: filters.page,
                limit: 15,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            };

            if (filters.status !== 'all') {
                params.status = filters.status;
            }
            if (filters.search) {
                params.search = filters.search;
            }

            const response = await driversAPI.getAll(params);
            setDrivers(response.data.data);
            setPagination(response.data.pagination);

            // Update URL params
            const newParams = new URLSearchParams();
            if (filters.status !== 'all') newParams.set('status', filters.status);
            if (filters.search) newParams.set('search', filters.search);
            if (filters.page > 1) newParams.set('page', filters.page);
            setSearchParams(newParams);

        } catch (error) {
            console.error('Error fetching drivers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, page: 1 }));
    };

    const handleApprove = async (driverId) => {
        setProcessing(true);
        try {
            await driversAPI.updateStatus(driverId, { status: 'approved' });
            fetchDrivers();
        } catch (error) {
            console.error('Error approving driver:', error);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedDriver) return;
        const reason = rejectionReason === 'Other' ? customReason : rejectionReason;
        if (!reason) return;

        setProcessing(true);
        try {
            await driversAPI.updateStatus(selectedDriver._id, {
                status: 'rejected',
                rejectionReason: reason
            });
            setShowRejectModal(false);
            setSelectedDriver(null);
            setRejectionReason('');
            setCustomReason('');
            fetchDrivers();
        } catch (error) {
            console.error('Error rejecting driver:', error);
        } finally {
            setProcessing(false);
        }
    };

    const handleStatusChange = async (driverId, newStatus) => {
        setProcessing(true);
        try {
            await driversAPI.updateStatus(driverId, { status: newStatus });
            fetchDrivers();
        } catch (error) {
            console.error('Error changing status:', error);
        } finally {
            setProcessing(false);
        }
    };

    const openRejectModal = (driver) => {
        setSelectedDriver(driver);
        setShowRejectModal(true);
    };

    const getStatusBadge = (status) => {
        const labels = {
            pending: 'Pending',
            under_review: 'Under Review',
            approved: 'Approved',
            rejected: 'Rejected'
        };
        return (
            <span className={`badge badge-${status}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="drivers-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        {isSalesAgent ? 'My Registrations' : 'Driver Management'}
                    </h1>
                    <p className="page-subtitle">
                        {pagination.total} driver{pagination.total !== 1 ? 's' : ''} registered
                    </p>
                </div>
                {isSalesAgent && (
                    <Link to="/drivers/new" className="btn btn-primary">
                        <Plus size={18} />
                        Register Driver
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <form className="search-form" onSubmit={handleSearch}>
                    <div className="search-input-wrapper">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            className="form-input search-input"
                            placeholder="Search by name, phone, or plate number..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                    </div>
                </form>

                <div className="filter-group">
                    <Filter size={18} className="text-muted" />
                    <select
                        className="form-input filter-select"
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="under_review">Under Review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Drivers Table */}
            <div className="card">
                {loading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                    </div>
                ) : drivers.length > 0 ? (
                    <>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Name 🧑‍💼</th>
                                        <th>Mobile 📱</th>
                                        <th>Code 🔢</th>
                                        <th>Plate 🚗</th>
                                        <th>Type</th>
                                        <th>Status ✅</th>
                                        {isSalesAgent ? (
                                            <th>Approved By ✅</th>
                                        ) : (
                                            <th>Registered By 🖊️</th>
                                        )}
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drivers.map(driver => (
                                        <tr key={driver._id}>
                                            <td>
                                                <div className="driver-cell">
                                                    <div className="driver-avatar">
                                                        <Car size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="driver-name">
                                                            {driver.driverInfo?.name}
                                                        </div>
                                                        {driver.driverInfo?.email && (
                                                            <div className="driver-email text-muted text-sm">
                                                                {driver.driverInfo.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{driver.driverInfo?.phone}</td>
                                            <td>
                                                {driver.driverInfo?.code && (
                                                    <span className="code-badge">{driver.driverInfo.code}</span>
                                                )}
                                            </td>
                                            <td>
                                                <code className="plate-number">
                                                    {driver.driverInfo?.plateNumber}
                                                </code>
                                            </td>
                                            <td>
                                                <span className={`badge badge-${driver.driverInfo?.registrationStatus || 'registration'}`}>
                                                    {driver.driverInfo?.registrationStatus === 'reactivation'
                                                        ? 'Reactivation ♻️'
                                                        : 'Registration 🖊️'}
                                                </span>
                                            </td>
                                            <td>{getStatusBadge(driver.status)}</td>
                                            <td className="text-sm">
                                                {isSalesAgent
                                                    ? (driver.reviewedBy?.name || '-')
                                                    : (driver.registeredBy?.name || 'Unknown')
                                                }
                                            </td>
                                            <td className="text-muted text-sm">
                                                {new Date(driver.createdAt).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <Link
                                                        to={`/drivers/${driver._id}`}
                                                        className="btn btn-ghost btn-sm btn-icon"
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </Link>

                                                    {isOperationsOrAdmin && (
                                                        <>
                                                            {driver.status !== 'approved' && (
                                                                <button
                                                                    className="btn btn-success btn-sm"
                                                                    onClick={() => handleApprove(driver._id)}
                                                                    disabled={processing}
                                                                    title="Approve"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                            )}
                                                            {driver.status !== 'rejected' && (
                                                                <button
                                                                    className="btn btn-danger btn-sm"
                                                                    onClick={() => openRejectModal(driver)}
                                                                    disabled={processing}
                                                                    title="Reject"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            )}
                                                            {driver.status === 'approved' && (
                                                                <button
                                                                    className="btn btn-warning btn-sm"
                                                                    onClick={() => handleStatusChange(driver._id, 'pending')}
                                                                    disabled={processing}
                                                                    title="Revert to Pending"
                                                                >
                                                                    Revert
                                                                </button>
                                                            )}
                                                            {driver.status === 'rejected' && (
                                                                <button
                                                                    className="btn btn-secondary btn-sm"
                                                                    onClick={() => handleStatusChange(driver._id, 'pending')}
                                                                    disabled={processing}
                                                                    title="Revert to Pending"
                                                                >
                                                                    Revert
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className="pagination">
                                <button
                                    className="btn btn-ghost btn-sm"
                                    disabled={pagination.page === 1}
                                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                                >
                                    <ChevronLeft size={16} />
                                    Previous
                                </button>
                                <span className="pagination-info">
                                    Page {pagination.page} of {pagination.pages}
                                </span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    disabled={pagination.page === pagination.pages}
                                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                                >
                                    Next
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="card-body">
                        <div className="empty-state">
                            <Car size={48} className="empty-state-icon" />
                            <h4 className="empty-state-title">No drivers found</h4>
                            <p className="empty-state-text">
                                {filters.search || filters.status !== 'all'
                                    ? 'Try adjusting your filters'
                                    : 'Register your first driver to get started'}
                            </p>
                            {isSalesAgent && !filters.search && (
                                <Link to="/drivers/new" className="btn btn-primary">
                                    <Plus size={18} />
                                    Register Driver
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Rejection Modal */}
            {showRejectModal && (
                <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Reject Driver</h3>
                            <button
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => setShowRejectModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="text-muted mb-4">
                                Rejecting: <strong>{selectedDriver?.driverInfo?.name}</strong>
                            </p>

                            <div className="form-group">
                                <label className="form-label">Rejection Reason</label>
                                <select
                                    className="form-input"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                >
                                    <option value="">Select a reason...</option>
                                    {REJECTION_REASONS.map(reason => (
                                        <option key={reason} value={reason}>{reason}</option>
                                    ))}
                                </select>
                            </div>

                            {rejectionReason === 'Other' && (
                                <div className="form-group">
                                    <label className="form-label">Custom Reason</label>
                                    <textarea
                                        className="form-input"
                                        rows={3}
                                        placeholder="Enter rejection reason..."
                                        value={customReason}
                                        onChange={(e) => setCustomReason(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowRejectModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleReject}
                                disabled={!rejectionReason || (rejectionReason === 'Other' && !customReason) || processing}
                            >
                                {processing ? <Loader size={16} className="spin" /> : <X size={16} />}
                                Reject Driver
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Drivers;
