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
    ChevronRight
} from 'lucide-react';
import './Drivers.css';

function Drivers() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [drivers, setDrivers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        status: searchParams.get('status') || 'all',
        search: searchParams.get('search') || '',
        page: parseInt(searchParams.get('page')) || 1
    });

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
                        {user.role === 'sales_agent' ? 'My Drivers' : 'All Drivers'}
                    </h1>
                    <p className="page-subtitle">
                        {pagination.total} driver{pagination.total !== 1 ? 's' : ''} registered
                    </p>
                </div>
                {(user.role === 'sales_agent' || user.role === 'admin') && (
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
                                        <th>Status 🖊️♻️</th>
                                        <th>Registered By 🖊️</th>
                                        <th>Date</th>
                                        <th></th>
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
                                            <td className="text-sm">
                                                {driver.registeredBy?.name || 'Unknown'}
                                            </td>
                                            <td className="text-muted text-sm">
                                                {new Date(driver.createdAt).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <Link
                                                    to={`/drivers/${driver._id}`}
                                                    className="btn btn-ghost btn-sm btn-icon"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </Link>
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
                            {(user.role === 'sales_agent' || user.role === 'admin') && !filters.search && (
                                <Link to="/drivers/new" className="btn btn-primary">
                                    <Plus size={18} />
                                    Register Driver
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Drivers;
