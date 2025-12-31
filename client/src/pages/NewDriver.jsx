import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { driversAPI, documentsAPI } from '../services/api';
import {
    User,
    Car,
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
    { id: 1, title: 'Personal Info', icon: User },
    { id: 2, title: 'Vehicle Info', icon: Car },
    { id: 3, title: 'Documents', icon: FileText }
];

const DOCUMENT_TYPES = [
    { id: 'license', label: 'Driving License', required: true },
    { id: 'insurance', label: 'Vehicle Insurance', required: true },
    { id: 'vehicle_registration', label: 'Vehicle Registration', required: true },
    { id: 'photo', label: 'Driver Photo', required: true }
];

function NewDriver() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [driverId, setDriverId] = useState(null);

    const [formData, setFormData] = useState({
        personalInfo: {
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            dateOfBirth: '',
            address: {
                city: 'Addis Ababa',
                subcity: '',
                woreda: ''
            }
        },
        vehicleInfo: {
            plateNumber: '',
            make: '',
            model: '',
            year: '',
            color: '',
            vehicleType: 'sedan'
        }
    });

    const [documents, setDocuments] = useState({
        license: null,
        insurance: null,
        vehicle_registration: null,
        photo: null
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
            const { firstName, lastName, phone } = formData.personalInfo;
            if (!firstName || !lastName || !phone) {
                setError('Please fill in all required fields');
                return false;
            }
            // Validate Ethiopian phone
            const phoneRegex = /^(\+251|0)?[79]\d{8}$/;
            if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
                setError('Please enter a valid Ethiopian phone number');
                return false;
            }
        }

        if (step === 2) {
            const { plateNumber, make, model } = formData.vehicleInfo;
            if (!plateNumber || !make || !model) {
                setError('Please fill in all required fields');
                return false;
            }
        }

        return true;
    };

    const handleNext = async () => {
        if (!validateStep(currentStep)) return;

        if (currentStep === 2 && !driverId) {
            // Create driver before moving to documents
            try {
                setLoading(true);
                const response = await driversAPI.create(formData);
                setDriverId(response.data.data._id);
                setCurrentStep(3);
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

                    {/* Step 1: Personal Info */}
                    {currentStep === 1 && (
                        <div className="form-step">
                            <h3 className="step-heading">Personal Information</h3>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label required">First Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter first name"
                                        value={formData.personalInfo.firstName}
                                        onChange={(e) => handleInputChange('personalInfo', 'firstName', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Last Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter last name"
                                        value={formData.personalInfo.lastName}
                                        onChange={(e) => handleInputChange('personalInfo', 'lastName', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Phone Number</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        placeholder="+251 9XX XXX XXX"
                                        value={formData.personalInfo.phone}
                                        onChange={(e) => handleInputChange('personalInfo', 'phone', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="driver@email.com"
                                        value={formData.personalInfo.email}
                                        onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Date of Birth</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.personalInfo.dateOfBirth}
                                        onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">City</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.personalInfo.address.city}
                                        onChange={(e) => handleInputChange('personalInfo', 'address.city', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Sub City</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., Bole, Kirkos"
                                        value={formData.personalInfo.address.subcity}
                                        onChange={(e) => handleInputChange('personalInfo', 'address.subcity', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Woreda</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Woreda number"
                                        value={formData.personalInfo.address.woreda}
                                        onChange={(e) => handleInputChange('personalInfo', 'address.woreda', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Vehicle Info */}
                    {currentStep === 2 && (
                        <div className="form-step">
                            <h3 className="step-heading">Vehicle Information</h3>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label required">Plate Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., 3-12345"
                                        value={formData.vehicleInfo.plateNumber}
                                        onChange={(e) => handleInputChange('vehicleInfo', 'plateNumber', e.target.value.toUpperCase())}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Vehicle Type</label>
                                    <select
                                        className="form-input"
                                        value={formData.vehicleInfo.vehicleType}
                                        onChange={(e) => handleInputChange('vehicleInfo', 'vehicleType', e.target.value)}
                                    >
                                        <option value="sedan">Sedan</option>
                                        <option value="suv">SUV</option>
                                        <option value="minibus">Minibus</option>
                                        <option value="bajaj">Bajaj</option>
                                        <option value="motorcycle">Motorcycle</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Make</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., Toyota, Hyundai"
                                        value={formData.vehicleInfo.make}
                                        onChange={(e) => handleInputChange('vehicleInfo', 'make', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Model</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., Corolla, Accent"
                                        value={formData.vehicleInfo.model}
                                        onChange={(e) => handleInputChange('vehicleInfo', 'model', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Year</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="e.g., 2020"
                                        min="1990"
                                        max={new Date().getFullYear() + 1}
                                        value={formData.vehicleInfo.year}
                                        onChange={(e) => handleInputChange('vehicleInfo', 'year', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Color</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., White, Silver"
                                        value={formData.vehicleInfo.color}
                                        onChange={(e) => handleInputChange('vehicleInfo', 'color', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Documents */}
                    {currentStep === 3 && (
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

                        {currentStep < 3 ? (
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
