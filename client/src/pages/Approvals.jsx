import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { driversAPI } from '../services/api';
import {
    FileCheck,
    FileX,
    Eye,
    Check,
    X,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Loader,
    Clock,
    Car
} from 'lucide-react';
import './Approvals.css';

const REJECTION_REASONS = [
    'Missing documents',
    'Invalid documents',
    'Information does not match',
    'Expired documents',
    'Failed verification',
    'Other'
];

function Approvals() {
    const [drivers, setDrivers] = useState([]);
    const [counts, setCounts] = useState({ pending: 0, under_review: 0, approved: 0, rejected: 0 });
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: 'pending' });

    const [selectedDriver, setSelectedDriver] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchDrivers();
    }, [filters]);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: 20,
                status: filters.status === 'all' ? undefined : filters.status
            };

            const response = await driversAPI.getQueue(params);
            setDrivers(response.data.data);
            setCounts(response.data.counts);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        } finally {
            setLoading(false);
        }
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

    const openRejectModal = (driver) => {
        setSelectedDriver(driver);
        setShowRejectModal(true);
    };

    const getStatusBadge = (status) => {
        const icons = {
            pending: <Clock size={12} />,
            under_review: <AlertCircle size={12} />,
            approved: <Check size={12} />,
            rejected: <X size={12} />
        };
        const labels = {
            pending: 'Pending',
            under_review: 'Under Review',
            approved: 'Approved',
            rejected: 'Rejected'
        };
        return (
            <span className={`badge badge-${status}`}>
                {icons[status]}
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="approvals-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Driver Approval Queue</h1>
                    <p className="page-subtitle">Review and approve driver registrations</p>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="status-tabs">
                <button
                    className={`tab ${filters.status === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilters(prev => ({ ...prev, status: 'pending' }))}
                >
                    <Clock size={16} />
                    Pending
                    <span className="tab-count">{counts.pending}</span>
                </button>
                <button
                    className={`tab ${filters.status === 'under_review' ? 'active' : ''}`}
                    onClick={() => setFilters(prev => ({ ...prev, status: 'under_review' }))}
                >
                    <AlertCircle size={16} />
                    Under Review
                    <span className="tab-count">{counts.under_review}</span>
                </button>
                <button
                    className={`tab ${filters.status === 'approved' ? 'active' : ''}`}
                    onClick={() => setFilters(prev => ({ ...prev, status: 'approved' }))}
                >
                    <Check size={16} />
                    Approved
                    <span className="tab-count">{counts.approved}</span>
                </button>
                <button
                    className={`tab ${filters.status === 'rejected' ? 'active' : ''}`}
                    onClick={() => setFilters(prev => ({ ...prev, status: 'rejected' }))}
                >
                    <X size={16} />
                    Rejected
                    <span className="tab-count">{counts.rejected}</span>
                </button>
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
                                        <th>Driver</th>
                                        <th>Mobile</th>
                                        <th>Plate</th>
                                        <th>Type</th>
                                        <th>Registered By</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drivers.map(driver => (
                                        <tr key={driver._id}>
                                            <td>
                                                <div className="driver-info">
                                                    <div className="driver-avatar">
                                                        <Car size={16} />
                                                    </div>
                                                    <div>
                                                        <span className="driver-name">
                                                            {driver.driverInfo?.name}
                                                        </span>
                                                        {driver.driverInfo?.code && (
                                                            <span className="text-muted text-sm">
                                                                Code: {driver.driverInfo.code}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{driver.driverInfo?.phone}</td>
                                            <td>
                                                <code className="plate-number">
                                                    {driver.driverInfo?.plateNumber}
                                                </code>
                                            </td>
                                            <td>
                                                <span className={`badge badge-${driver.driverInfo?.registrationStatus || 'registration'}`}>
                                                    {driver.driverInfo?.registrationStatus === 'reactivation'
                                                        ? 'Reactivation'
                                                        : 'Registration'}
                                                </span>
                                            </td>
                                            <td className="text-sm">
                                                {driver.registeredBy?.name || 'Unknown'}
                                            </td>
                                            <td className="text-muted text-sm">
                                                {new Date(driver.createdAt).toLocaleDateString()}
                                            </td>
                                            <td>{getStatusBadge(driver.status)}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <Link
                                                        to={`/drivers/${driver._id}`}
                                                        className="btn btn-ghost btn-sm btn-icon"
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </Link>

                                                    {(driver.status === 'pending' || driver.status === 'under_review') && (
                                                        <>
                                                            <button
                                                                className="btn btn-success btn-sm"
                                                                onClick={() => handleApprove(driver._id)}
                                                                disabled={processing}
                                                            >
                                                                <Check size={14} />
                                                                Approve
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => openRejectModal(driver)}
                                                                disabled={processing}
                                                            >
                                                                <X size={14} />
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}

                                                    {driver.status === 'rejected' && driver.rejectionReason && (
                                                        <span className="rejection-reason" title={driver.rejectionReason}>
                                                            {driver.rejectionReason}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {pagination.pages > 1 && (
                            <div className="pagination">
                                <button
                                    className="btn btn-ghost btn-sm"
                                    disabled={pagination.page === 1}
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="pagination-info">
                                    Page {pagination.page} of {pagination.pages}
                                </span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    disabled={pagination.page === pagination.pages}
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="card-body">
                        <div className="empty-state">
                            <FileCheck size={48} className="empty-state-icon" />
                            <h4 className="empty-state-title">No drivers found</h4>
                            <p className="empty-state-text">
                                {filters.status === 'pending'
                                    ? 'All drivers have been reviewed!'
                                    : 'No drivers match the current filter'}
                            </p>
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
                                Please select a reason for rejecting this driver: <strong>{selectedDriver?.driverInfo?.name}</strong>
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

export default Approvals;
