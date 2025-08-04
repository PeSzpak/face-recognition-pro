import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PersonCard } from './PersonCard';

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState({ totalPersons: 0, recognitionsToday: 0, accuracy: 0 });
    const [recentActivities, setRecentActivities] = useState([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get('/api/dashboard/stats');
                setStats(response.data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };

        const fetchRecentActivities = async () => {
            try {
                const response = await axios.get('/api/dashboard/recent');
                setRecentActivities(response.data);
            } catch (error) {
                console.error('Error fetching recent activities:', error);
            }
        };

        fetchStats();
        fetchRecentActivities();
    }, []);

    return (
        <div className="dashboard">
            <h1>Dashboard</h1>
            <div className="stats">
                <div className="stat-card">
                    <h2>Total Persons</h2>
                    <p>{stats.totalPersons}</p>
                </div>
                <div className="stat-card">
                    <h2>Recognitions Today</h2>
                    <p>{stats.recognitionsToday}</p>
                </div>
                <div className="stat-card">
                    <h2>Accuracy</h2>
                    <p>{stats.accuracy}%</p>
                </div>
            </div>
            <h2>Recent Activities</h2>
            <div className="recent-activities">
                {recentActivities.map(activity => (
                    <PersonCard key={activity.id} person={activity} />
                ))}
            </div>
        </div>
    );
};

export default Dashboard;