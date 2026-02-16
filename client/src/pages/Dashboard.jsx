import { useState, useEffect } from 'react'
import axios from 'axios'
import BackupCard from '../components/BackupCard'
import HistoryTable from '../components/HistoryTable'
import './Dashboard.css'

function Dashboard({ user, onLogout }) {
    const [backups, setBackups] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [refreshKey, setRefreshKey] = useState(0)
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    })

    useEffect(() => {
        fetchBackupHistory(pagination.page)
    }, [refreshKey, pagination.page])

    const fetchBackupHistory = async (page = 1) => {
        setIsLoading(true)
        try {
            const response = await axios.get(`/api/backup/history?page=${page}&limit=${pagination.limit}`)
            if (response.data.success) {
                setBackups(response.data.backups)
                setPagination(prev => ({
                    ...prev,
                    ...response.data.pagination
                }))
            }
        } catch (error) {
            console.error('Failed to fetch backup history:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }))
    }

    const handleBackupComplete = () => {
        setRefreshKey(prev => prev + 1)
    }

    return (
        <div className="dashboard-container">
            {/* Header */}
            <header className="dashboard-header glass-dark">
                <div className="header-content">
                    <div className="header-left">
                        <div className="logo-badge">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                            </svg>
                        </div>
                        <div>
                            <h1>Server Backup Manager</h1>
                            <p className="header-subtitle">Ubuntu Server Backup System</p>
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="user-info">
                            <div className="user-avatar">
                                {user?.username?.charAt(0).toUpperCase() || 'A'}
                            </div>
                            <div className="user-details">
                                <span className="user-name">{user?.username || 'Admin'}</span>
                                <span className="user-role">Administrator</span>
                            </div>
                        </div>
                        <a href="/settings" className="btn btn-outline">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Settings
                        </a>
                        <button onClick={onLogout} className="btn btn-outline">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="dashboard-main">
                <div className="container">
                    {/* Backup Controls */}
                    <section className="backup-section fade-in">
                        <h2 className="section-title">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Backup Controls
                        </h2>
                        <div className="backup-grid">
                            <BackupCard
                                title="MySQL Database"
                                description="Backup all MySQL databases using mysqldump"
                                icon={
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                    </svg>
                                }
                                type="mysql"
                                onBackupComplete={handleBackupComplete}
                            />
                            <BackupCard
                                title="File System (/www)"
                                description="Backup /www directory as compressed archive"
                                icon={
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                }
                                type="files"
                                onBackupComplete={handleBackupComplete}
                            />
                        </div>
                    </section>

                    {/* Backup History */}
                    <section className="history-section fade-in">
                        <div className="section-header">
                            <h2 className="section-title">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Backup History
                            </h2>
                            <button
                                onClick={() => setRefreshKey(prev => prev + 1)}
                                className="btn btn-outline btn-sm"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                        </div>
                        <HistoryTable
                            backups={backups}
                            isLoading={isLoading}
                            pagination={pagination}
                            onPageChange={handlePageChange}
                        />
                    </section>
                </div>
            </main>
        </div>
    )
}

export default Dashboard
