import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { driversAPI, documentsAPI } from '../services/api';
import {
    User,
    FileText,
    Upload,
    Check,
    AlertCircle,
    ChevronRight,
    ChevronLeft,
    Loader,
    X
} from 'lucide-react';
import './NewDriver.css';

const STEPS = [
    { id: 1, title: 'Driver Info', icon: User },
    { id: 2, title: 'Documents', icon: FileText }
];

const DOCUMENT_TYPES = [
    { id: 'dl', label: 'DL 🪪', fullLabel: 'Driving License', required: false },
    { id: 'lib', label: 'Lib 📚', fullLabel: 'Libre (Vehicle Registration)', required: false },
    { id: 'ins', label: 'Ins 🛡️', fullLabel: 'Insurance', required: false },
    { id: 'bl', label: 'BL 🏢', fullLabel: 'Business License', required: false },
    { id: 'tin', label: 'TIN 🧾', fullLabel: 'TIN Certificate', required: false },
    { id: 'poa', label: 'POA 📜', fullLabel: 'Power of Attorney', required: false }
];

const STATUS_OPTIONS = [
    { value: 'registration', label: 'Registration 🖊️' },
    { value: 'reactivation', label: 'Reactivation ♻️' }
];

function NewDriver() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [driverId, setDriverId] = useState(null);

    const [formData, setFormData] = useState({
        driverInfo: {
            name: '',
            phone: '',
            email: '',
            code: '',
            plateNumber: '',
            registrationStatus: 'registration',
            tinNo: ''
        }
    });

    const [documents, setDocuments] = useState({
        dl: null,
        lib: null,
        ins: null,
        bl: null,
        tin: null,
        poa: null
    });

    const [uploadStatus, setUploadStatus] = useState({});

    const handleInputChange = (section, field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setFormData(prev => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    [parent]: {
                        ...prev[section][parent],
                        [child]: value
                    }
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            }));
        }
    };

    const handleFileChange = (docType, file) => {
        if (file) {
            // Validate file
            const maxSize = 5 * 1024 * 1024; // 5MB
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

            if (file.size > maxSize) {
                setError(`File size must be less than 5MB`);
                return;
            }

            if (!allowedTypes.includes(file.type)) {
                setError('Only JPEG, PNG, WebP, and PDF files are allowed');
                return;
            }

            setDocuments(prev => ({ ...prev, [docType]: file }));
            setError('');
        }
    };

    const removeFile = (docType) => {
        setDocuments(prev => ({ ...prev, [docType]: null }));
        setUploadStatus(prev => ({ ...prev, [docType]: null }));
    };

    const validateStep = (step) => {
        setError('');

        if (step === 1) {
            const { name, phone, plateNumber } = formData.driverInfo;
            if (!name || !phone || !plateNumber) {
                setError('Please fill in all required fields (Name, Phone, Plate Number)');
                return false;
            }
            // Validate Ethiopian phone (with 251 prefix format)
            const phoneRegex = /^(251)?[79]\d{8}$/;
            if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
                setError('Please enter a valid phone number (e.g., 251912345678)');
                return false;
            }
        }

        return true;
    };

    const handleNext = async () => {
        if (!validateStep(currentStep)) return;

        if (currentStep === 1 && !driverId) {
            // Create driver before moving to documents
            try {
                setLoading(true);
                const response = await driversAPI.create(formData);
                setDriverId(response.data.data._id);
                setCurrentStep(2);
            } catch (err) {
                setError(err.response?.data?.message || 'Error creating driver');
            } finally {
                setLoading(false);
            }
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
    };

    const uploadDocument = async (docType) => {
        if (!documents[docType] || !driverId) return;

        setUploadStatus(prev => ({ ...prev, [docType]: 'uploading' }));

        try {
            const formDataObj = new FormData();
            formDataObj.append('file', documents[docType]);
            formDataObj.append('type', docType);

            await documentsAPI.upload(driverId, formDataObj);
            setUploadStatus(prev => ({ ...prev, [docType]: 'success' }));
        } catch (err) {
            setUploadStatus(prev => ({ ...prev, [docType]: 'error' }));
            setError(`Failed to upload ${docType}`);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        // Upload all documents
        const uploadPromises = Object.keys(documents)
            .filter(key => documents[key] && uploadStatus[key] !== 'success')
            .map(key => uploadDocument(key));

        await Promise.all(uploadPromises);

        // Check if all required documents uploaded
        const requiredDocs = DOCUMENT_TYPES.filter(d => d.required).map(d => d.id);
        const allUploaded = requiredDocs.every(doc =>
            uploadStatus[doc] === 'success' || (documents[doc] && uploadStatus[doc] !== 'error')
        );

        if (allUploaded) {
            navigate('/drivers', { state: { message: 'Driver registered successfully!' } });
        } else {
            setError('Please upload all required documents');
        }

        setLoading(false);
    };

    return (
        <div className="new-driver-page">
            <div className="page-header">
                <h1 className="page-title">Register New Driver</h1>
                <p className="page-subtitle">Add a new driver to the system</p>
            </div>

            {/* Progress Steps */}
            <div className="steps-container">
                {STEPS.map((step, index) => (
                    <div
                        key={step.id}
                        className={`step ${currentStep >= step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
                    >
                        <div className="step-indicator">
                            {currentStep > step.id ? <Check size={16} /> : <step.icon size={16} />}
                        </div>
                        <span className="step-title">{step.title}</span>
                        {index < STEPS.length - 1 && <div className="step-connector"></div>}
                    </div>
                ))}
            </div>

            <div className="form-card card">
                <div className="card-body">
                    {error && (
                        <div className="form-error-banner">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    {/* Step 1: Driver Info */}
                    {currentStep === 1 && (
                        <div className="form-step">
                            <h3 className="step-heading">Driver Information</h3>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label required">Name 🧑‍💼</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter full name"
                                        value={formData.driverInfo.name}
                                        onChange={(e) => handleInputChange('driverInfo', 'name', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Mobile 📱</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        placeholder="251912345678"
                                        value={formData.driverInfo.phone}
                                        onChange={(e) => handleInputChange('driverInfo', 'phone', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Email 📧</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="driver@email.com"
                                        value={formData.driverInfo.email}
                                        onChange={(e) => handleInputChange('driverInfo', 'email', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Code 🔢</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., 03"
                                        value={formData.driverInfo.code}
                                        onChange={(e) => handleInputChange('driverInfo', 'code', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Plate 🚗</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., B59576"
                                        value={formData.driverInfo.plateNumber}
                                        onChange={(e) => handleInputChange('driverInfo', 'plateNumber', e.target.value.toUpperCase())}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Status 🖊️♻️</label>
                                    <select
                                        className="form-input"
                                        value={formData.driverInfo.registrationStatus}
                                        onChange={(e) => handleInputChange('driverInfo', 'registrationStatus', e.target.value)}
                                    >
                                        {STATUS_OPTIONS.map(option => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">TIN No 🆔</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., 0085155141"
                                        value={formData.driverInfo.tinNo}
                                        onChange={(e) => handleInputChange('driverInfo', 'tinNo', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Documents */}
                    {currentStep === 2 && (
                        <div className="form-step">
                            <h3 className="step-heading">Upload Documents</h3>
                            <p className="step-description">
                                Upload the required documents for driver verification
                            </p>

                            <div className="documents-grid">
                                {DOCUMENT_TYPES.map(docType => (
                                    <div key={docType.id} className="document-upload-card">
                                        <div className="document-header">
                                            <span className="document-label">
                                                {docType.label}
                                                {docType.required && <span className="required-dot">*</span>}
                                            </span>
                                            {uploadStatus[docType.id] === 'success' && (
                                                <Check size={18} className="text-success" />
                                            )}
                                        </div>

                                        {documents[docType.id] ? (
                                            <div className="file-preview">
                                                <FileText size={24} />
                                                <div className="file-info">
                                                    <span className="file-name">{documents[docType.id].name}</span>
                                                    <span className="file-size">
                                                        {(documents[docType.id].size / 1024).toFixed(1)} KB
                                                    </span>
                                                </div>
                                                <button
                                                    className="btn btn-ghost btn-icon btn-sm"
                                                    onClick={() => removeFile(docType.id)}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="upload-area">
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    onChange={(e) => handleFileChange(docType.id, e.target.files[0])}
                                                    hidden
                                                />
                                                <Upload size={24} />
                                                <span>Click to upload</span>
                                                <span className="upload-hint">PDF, JPG, PNG up to 5MB</span>
                                            </label>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Form Actions */}
                    <div className="form-actions">
                        {currentStep > 1 && (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleBack}
                                disabled={loading}
                            >
                                <ChevronLeft size={18} />
                                Back
                            </button>
                        )}

                        <div className="flex-spacer"></div>

                        {currentStep < 2 ? (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleNext}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader size={18} className="spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        Next
                                        <ChevronRight size={18} />
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-success"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader size={18} className="spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Check size={18} />
                                        Submit Registration
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default NewDriver;
