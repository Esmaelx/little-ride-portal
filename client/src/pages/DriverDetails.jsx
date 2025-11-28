import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { driversAPI, documentsAPI } from '../services/api';
import {
    ArrowLeft,
    Car,
    Phone,
    Mail,
    Hash,
    FileText,
    Check,
    X,
    Clock,
    AlertCircle,
    User,
    Calendar,
    Loader,
    Eye,
    Download
} from 'lucide-react';
import './DriverDetails.css';

const DOCUMENT_LABELS = {
    dl: 'Driving License 🪪',
    lib: 'Libre (Vehicle Registration) 📚',
    ins: 'Insurance 🛡️',
    bl: 'Business License 🏢',
    tin: 'TIN Certificate 🧾',
    poa: 'Power of Attorney 📜'
};

const REJECTION_REASONS = [
    'Missing documents',
    'Invalid documents',
    'Information does not match',
    'Expired documents',
    'Failed verification',
    'Other'
];

function DriverDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [driver, setDriver] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    // Rejection modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [customReason, setCustomReason] = useState('');

    // Document image previews
    const [documentImageUrls, setDocumentImageUrls] = useState({});

    const isOperationsOrAdmin = user?.role === 'operations' || user?.role === 'admin';

    useEffect(() => {
        fetchDriverDetails();
    }, [id]);

    // Fetch image previews for documents
    useEffect(() => {
        const fetchDocumentImages = async () => {
            const imageUrls = {};
            for (const doc of documents) {
                // Check if it's an image type
                if (doc.mimeType && doc.mimeType.startsWith('image/')) {
                    try {
                        const response = await documentsAPI.getFile(doc._id);
                        const url = URL.createObjectURL(response.data);
                        imageUrls[doc._id] = url;
                    } catch (err) {
                        console.error('Error fetching document image:', doc._id, err);
                    }
                }
            }
            setDocumentImageUrls(imageUrls);
        };

        if (documents.length > 0) {
            fetchDocumentImages();
        }

        // Cleanup blob URLs on unmount
        return () => {
            Object.values(documentImageUrls).forEach(url => URL.revokeObjectURL(url));
        };
    }, [documents]);

    const fetchDriverDetails = async () => {
        try {
            setLoading(true);
            const response = await driversAPI.getById(id);
            setDriver(response.data.data.driver);
            setDocuments(response.data.data.documents || []);
        } catch (err) {
            console.error('Error fetching driver:', err);
            setError('Failed to load driver details');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setProcessing(true);
        try {
            await driversAPI.updateStatus(id, { status: 'approved' });
            fetchDriverDetails();
        } catch (err) {
            console.error('Error approving driver:', err);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        const reason = rejectionReason === 'Other' ? customReason : rejectionReason;
        if (!reason) return;

        setProcessing(true);
        try {
            await driversAPI.updateStatus(id, {
                status: 'rejected',
                rejectionReason: reason
            });
            setShowRejectModal(false);
            setRejectionReason('');
            setCustomReason('');
            fetchDriverDetails();
        } catch (err) {
            console.error('Error rejecting driver:', err);
        } finally {
            setProcessing(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        setProcessing(true);
        try {
            await driversAPI.updateStatus(id, { status: newStatus });
            fetchDriverDetails();
        } catch (err) {
            console.error('Error changing status:', err);
        } finally {
            setProcessing(false);
        }
    };

    const viewDocument = async (docId) => {
        try {
            const response = await documentsAPI.getFile(docId);
            const url = URL.createObjectURL(response.data);
            window.open(url, '_blank');
        } catch (err) {
            console.error('Error viewing document:', err);
        }
    };

    const getStatusBadge = (status) => {
        const icons = {
            pending: <Clock size={14} />,
            under_review: <AlertCircle size={14} />,
            approved: <Check size={14} />,
            rejected: <X size={14} />
        };
        const labels = {
            pending: 'Pending',
            under_review: 'Under Review',
            approved: 'Approved',
            rejected: 'Rejected'
        };
        return (
            <span className={`badge badge-${status} badge-lg`}>
                {icons[status]}
                {labels[status] || status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error || !driver) {
        return (
            <div className="driver-details-page">
                <div className="empty-state">
                    <AlertCircle size={48} className="empty-state-icon" />
                    <h4 className="empty-state-title">{error || 'Driver not found'}</h4>
                    <Link to="/drivers" className="btn btn-primary">
                        <ArrowLeft size={18} />
                        Back to Drivers
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="driver-details-page">
            {/* Header */}
            <div className="page-header">
                <div className="header-left">
                    <button onClick={() => navigate('/drivers')} className="btn btn-ghost btn-icon">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="page-title">{driver.driverInfo?.name}</h1>
                        <p className="page-subtitle">
                            Driver Details • Registered {new Date(driver.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="header-right">
                    {getStatusBadge(driver.status)}
                </div>
            </div>

            {/* Action Bar for Operators */}
            {isOperationsOrAdmin && (
                <div className="action-bar card">
                    <div className="action-bar-content">
                        <span className="action-label">Change Status:</span>
                        <div className="action-buttons">
                            {driver.status !== 'approved' && (
                                <button
                                    className="btn btn-success"
                                    onClick={handleApprove}
                                    disabled={processing}
                                >
                                    {processing ? <Loader size={16} className="spin" /> : <Check size={16} />}
                                    Approve
                                </button>
                            )}
                            {driver.status !== 'rejected' && (
                                <button
                                    className="btn btn-danger"
                                    onClick={() => setShowRejectModal(true)}
                                    disabled={processing}
                                >
                                    <X size={16} />
                                    Reject
                                </button>
                            )}
                            {(driver.status === 'approved' || driver.status === 'rejected') && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleStatusChange('pending')}
                                    disabled={processing}
                                >
                                    Revert to Pending
                                </button>
                            )}
                        </div>
                    </div>
                    {driver.status === 'rejected' && driver.rejectionReason && (
                        <div className="rejection-info">
                            <AlertCircle size={16} />
                            <span>Rejection Reason: {driver.rejectionReason}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Driver Information */}
            <div className="details-grid">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <User size={18} />
                            Driver Information
                        </h3>
                    </div>
                    <div className="card-body">
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">
                                    <User size={14} /> Name
                                </span>
                                <span className="info-value">{driver.driverInfo?.name || '-'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">
                                    <Phone size={14} /> Mobile
                                </span>
                                <span className="info-value">{driver.driverInfo?.phone || '-'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">
                                    <Mail size={14} /> Email
                                </span>
                                <span className="info-value">{driver.driverInfo?.email || '-'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">
                                    <Hash size={14} /> Code
                                </span>
                                <span className="info-value">
                                    {driver.driverInfo?.code ? (
                                        <span className="code-badge">{driver.driverInfo.code}</span>
                                    ) : '-'}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">
                                    <Car size={14} /> Plate Number
                                </span>
                                <span className="info-value">
                                    <code className="plate-number">{driver.driverInfo?.plateNumber || '-'}</code>
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">
                                    <FileText size={14} /> TIN Number
                                </span>
                                <span className="info-value">{driver.driverInfo?.tinNo || '-'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">
                                    <FileText size={14} /> Registration Type
                                </span>
                                <span className="info-value">
                                    <span className={`badge badge-${driver.driverInfo?.registrationStatus || 'registration'}`}>
                                        {driver.driverInfo?.registrationStatus === 'reactivation'
                                            ? 'Reactivation ♻️'
                                            : 'Registration 🖊️'}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <Calendar size={18} />
                            Registration Details
                        </h3>
                    </div>
                    <div className="card-body">
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">Registered By</span>
                                <span className="info-value">{driver.registeredBy?.name || 'Unknown'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Registered On</span>
                                <span className="info-value">
                                    {new Date(driver.createdAt).toLocaleString()}
                                </span>
                            </div>
                            {driver.reviewedBy && (
                                <>
                                    <div className="info-item">
                                        <span className="info-label">Reviewed By</span>
                                        <span className="info-value">{driver.reviewedBy?.name || '-'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Reviewed On</span>
                                        <span className="info-value">
                                            {driver.reviewedAt
                                                ? new Date(driver.reviewedAt).toLocaleString()
                                                : '-'}
                                        </span>
                                    </div>
                                </>
                            )}
                            {driver.approvedAt && (
                                <div className="info-item">
                                    <span className="info-label">Approved On</span>
                                    <span className="info-value">
                                        {new Date(driver.approvedAt).toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Documents Section */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <FileText size={18} />
                        Uploaded Documents
                    </h3>
                </div>
                <div className="card-body">
                    {documents.length > 0 ? (
                        <div className="documents-grid">
                            {documents.map(doc => (
                                <div key={doc._id} className="document-card">
                                    <div className="document-preview">
                                        {documentImageUrls[doc._id] ? (
                                            <img
                                                src={documentImageUrls[doc._id]}
                                                alt={doc.originalName}
                                                className="document-thumbnail"
                                                onClick={() => viewDocument(doc._id)}
                                            />
                                        ) : doc.mimeType && doc.mimeType.startsWith('image/') ? (
                                            <div className="document-icon loading">
                                                <Loader size={24} className="spin" />
                                            </div>
                                        ) : (
                                            <div className="document-icon">
                                                <FileText size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="document-info">
                                        <span className="document-type">
                                            {DOCUMENT_LABELS[doc.type] || doc.type}
                                        </span>
                                        <span className="document-name">{doc.originalName}</span>
                                        <span className="document-size">
                                            {(doc.size / 1024).toFixed(1)} KB
                                        </span>
                                    </div>
                                    <div className="document-actions">
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => viewDocument(doc._id)}
                                            title="View Document"
                                        >
                                            <Eye size={16} />
                                            View
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state-inline">
                            <FileText size={24} className="text-muted" />
                            <span>No documents uploaded</span>
                        </div>
                    )}
                </div>
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
                                Rejecting: <strong>{driver.driverInfo?.name}</strong>
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

export default DriverDetails;
