import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { documentsAPI } from '../services/api';
import {
    FileCheck,
    FileX,
    Eye,
    Check,
    X,
    Filter,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Loader,
    ExternalLink
} from 'lucide-react';
import './Approvals.css';

const REJECTION_REASONS = [
    'Document is blurry or unreadable',
    'Document is expired',
    'Information does not match',
    'Document is incomplete',
    'Wrong document type',
    'Other'
];

function Approvals() {
    const [documents, setDocuments] = useState([]);
    const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: 'pending', type: '' });

    const [selectedDoc, setSelectedDoc] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, [filters]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: 20,
                status: filters.status === 'all' ? undefined : filters.status
            };
            if (filters.type) params.type = filters.type;

            const response = await documentsAPI.getQueue(params);
            setDocuments(response.data.data);
            setCounts(response.data.counts);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (docId) => {
        setProcessing(true);
        try {
            await documentsAPI.updateStatus(docId, { status: 'approved' });
            fetchDocuments();
        } catch (error) {
            console.error('Error approving document:', error);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedDoc) return;

        const reason = rejectionReason === 'Other' ? customReason : rejectionReason;
        if (!reason) return;

        setProcessing(true);
        try {
            await documentsAPI.updateStatus(selectedDoc._id, {
                status: 'rejected',
                rejectionReason: reason
            });
            setShowRejectModal(false);
            setSelectedDoc(null);
            setRejectionReason('');
            setCustomReason('');
            fetchDocuments();
        } catch (error) {
            console.error('Error rejecting document:', error);
        } finally {
            setProcessing(false);
        }
    };

    const openRejectModal = (doc) => {
        setSelectedDoc(doc);
        setShowRejectModal(true);
    };

    const viewDocument = async (docId) => {
        try {
            const response = await documentsAPI.getFile(docId);
            const url = URL.createObjectURL(response.data);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error viewing document:', error);
        }
    };

    const getDocTypeLabel = (type) => {
        const labels = {
            license: 'Driving License',
            insurance: 'Insurance',
            vehicle_registration: 'Vehicle Reg.',
            photo: 'Driver Photo',
            national_id: 'National ID',
            business_license: 'Business License'
        };
        return labels[type] || type;
    };

    const getStatusBadge = (status) => {
        const icons = {
            pending: <AlertCircle size={12} />,
            approved: <Check size={12} />,
            rejected: <X size={12} />
        };
        return (
            <span className={`badge badge-${status}`}>
                {icons[status]}
                {status}
            </span>
        );
    };

    return (
        <div className="approvals-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Document Approval Queue</h1>
                    <p className="page-subtitle">Review and approve driver documents</p>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="status-tabs">
                <button
                    className={`tab ${filters.status === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilters(prev => ({ ...prev, status: 'pending' }))}
                >
                    <AlertCircle size={16} />
                    Pending
                    <span className="tab-count">{counts.pending}</span>
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

            {/* Filter */}
            <div className="filters-bar">
                <div className="filter-group">
                    <Filter size={18} className="text-muted" />
                    <select
                        className="form-input filter-select"
                        value={filters.type}
                        onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    >
                        <option value="">All Document Types</option>
                        <option value="license">Driving License</option>
                        <option value="insurance">Insurance</option>
                        <option value="vehicle_registration">Vehicle Registration</option>
                        <option value="photo">Driver Photo</option>
                    </select>
                </div>
            </div>

            {/* Documents Table */}
            <div className="card">
                {loading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                    </div>
                ) : documents.length > 0 ? (
                    <>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Driver</th>
                                        <th>Document Type</th>
                                        <th>Uploaded</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map(doc => (
                                        <tr key={doc._id}>
                                            <td>
                                                <div className="driver-info">
                                                    <span className="driver-name">
                                                        {doc.driver?.driverInfo?.name}
                                                    </span>
                                                    <span className="text-muted text-sm">
                                                        {doc.driver?.driverInfo?.plateNumber}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="doc-type">{getDocTypeLabel(doc.type)}</span>
                                            </td>
                                            <td className="text-muted text-sm">
                                                {new Date(doc.createdAt).toLocaleDateString()}
                                            </td>
                                            <td>{getStatusBadge(doc.status)}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn btn-ghost btn-sm btn-icon"
                                                        title="View Document"
                                                        onClick={() => viewDocument(doc._id)}
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    {doc.status === 'pending' && (
                                                        <>
                                                            <button
                                                                className="btn btn-success btn-sm"
                                                                onClick={() => handleApprove(doc._id)}
                                                                disabled={processing}
                                                            >
                                                                <Check size={14} />
                                                                Approve
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => openRejectModal(doc)}
                                                                disabled={processing}
                                                            >
                                                                <X size={14} />
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}

                                                    {doc.status === 'rejected' && doc.rejectionReason && (
                                                        <span className="rejection-reason" title={doc.rejectionReason}>
                                                            {doc.rejectionReason}
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
                            <h4 className="empty-state-title">No documents found</h4>
                            <p className="empty-state-text">
                                {filters.status === 'pending'
                                    ? 'All documents have been reviewed!'
                                    : 'No documents match the current filters'}
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
                            <h3>Reject Document</h3>
                            <button
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => setShowRejectModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="text-muted mb-4">
                                Please select a reason for rejecting this document.
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
                                Reject Document
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Approvals;
