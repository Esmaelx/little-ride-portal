import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { driversAPI } from '../services/api';
import {
    Users,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    Plus,
    ArrowRight,
    Car
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import './Dashboard.css';

function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentDrivers, setRecentDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');

    useEffect(() => {
        fetchData();
    }, [period]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, driversRes] = await Promise.all([
                driversAPI.getStats({ period }),
                driversAPI.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' })
            ]);

            setStats(statsRes.data.data);
            setRecentDrivers(driversRes.data.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const statusColors = {
        pending: '#d97706',
        under_review: '#0891b2',
        approved: '#059669',
        rejected: '#dc2626'
    };

    const pieData = stats ? [
        { name: 'Pending', value: stats.summary.pending, color: statusColors.pending },
        { name: 'Under Review', value: stats.summary.under_review, color: statusColors.under_review },
        { name: 'Approved', value: stats.summary.approved, color: statusColors.approved },
        { name: 'Rejected', value: stats.summary.rejected, color: statusColors.rejected }
    ].filter(item => item.value > 0) : [];

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

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">
                        {user.role === 'sales_agent'
                            ? 'Your performance overview'
                            : 'System overview and metrics'}
                    </p>
                </div>
                <div className="page-actions">
                    <select
                        className="form-input period-select"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <option value="day">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
                    {(user.role === 'sales_agent' || user.role === 'admin') && (
                        <Link to="/drivers/new" className="btn btn-primary">
                            <Plus size={18} />
                            Register Driver
                        </Link>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.summary?.total || 0}</div>
                        <div className="stat-label">Total Registrations</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning">
                        <Clock size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.summary?.pending || 0}</div>
                        <div className="stat-label">Pending Review</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.summary?.approved || 0}</div>
                        <div className="stat-label">Approved</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon danger">
                        <XCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.summary?.rejected || 0}</div>
                        <div className="stat-label">Rejected</div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
                <div className="card chart-card">
                    <div className="card-header">
                        <h3 className="card-title">Registration Trend</h3>
                        <TrendingUp size={20} className="text-muted" />
                    </div>
                    <div className="card-body">
                        {stats?.daily?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={stats.daily}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1e40af" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(value) => {
                                            const date = new Date(value);
                                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        }}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#1e40af"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorCount)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-state">
                                <p className="text-muted">No data for selected period</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card chart-card">
                    <div className="card-header">
                        <h3 className="card-title">Status Distribution</h3>
                    </div>
                    <div className="card-body">
                        {pieData.length > 0 ? (
                            <div className="pie-chart-container">
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="pie-legend">
                                    {pieData.map((item, index) => (
                                        <div key={index} className="legend-item">
                                            <span
                                                className="legend-dot"
                                                style={{ backgroundColor: item.color }}
                                            ></span>
                                            <span className="legend-label">{item.name}</span>
                                            <span className="legend-value">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <p className="text-muted">No registrations yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Registrations */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Recent Registrations</h3>
                    <Link to="/drivers" className="btn btn-ghost btn-sm">
                        View All
                        <ArrowRight size={16} />
                    </Link>
                </div>
                {recentDrivers.length > 0 ? (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Driver</th>
                                    <th>Phone</th>
                                    <th>Vehicle</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentDrivers.map(driver => (
                                    <tr key={driver._id}>
                                        <td>
                                            <div className="driver-cell">
                                                <div className="driver-avatar">
                                                    <Car size={16} />
                                                </div>
                                                <div>
                                                    <div className="driver-name">
                                                        {driver.personalInfo.firstName} {driver.personalInfo.lastName}
                                                    </div>
                                                    <div className="driver-plate">
                                                        {driver.vehicleInfo.plateNumber}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{driver.personalInfo.phone}</td>
                                        <td>
                                            {driver.vehicleInfo.make} {driver.vehicleInfo.model}
                                        </td>
                                        <td>{getStatusBadge(driver.status)}</td>
                                        <td className="text-muted">
                                            {new Date(driver.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="card-body">
                        <div className="empty-state">
                            <Car size={48} className="empty-state-icon" />
                            <h4 className="empty-state-title">No registrations yet</h4>
                            <p className="empty-state-text">
                                Start by registering your first driver
                            </p>
                            <Link to="/drivers/new" className="btn btn-primary">
                                <Plus size={18} />
                                Register Driver
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
