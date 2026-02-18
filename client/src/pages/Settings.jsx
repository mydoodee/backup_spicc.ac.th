import { useState, useEffect } from 'react'
import axios from 'axios'
import './Settings.css'

function Settings({ user, onBack }) {
    const [driveStatus, setDriveStatus] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isTesting, setIsTesting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [testResult, setTestResult] = useState(null)
    const [updateResult, setUpdateResult] = useState(null)
    const [authUrl, setAuthUrl] = useState(null)
    const [scheduleSettings, setScheduleSettings] = useState({
        enabled: false,
        cron: '0 3 * * *',
        type: 'both'
    })

    useEffect(() => {
        // Check URL parameters for OAuth status
        const params = new URLSearchParams(window.location.search)
        const success = params.get('success')
        const error = params.get('error')

        if (success) {
            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname)
            setTestResult({
                success: true,
                message: 'Google Drive connected successfully!'
            })
        } else if (error) {
            window.history.replaceState({}, document.title, window.location.pathname)
            setTestResult({
                success: false,
                message: 'Connection failed',
                error: decodeURIComponent(error)
            })
        }

        fetchDriveStatus()
        fetchScheduleSettings()
    }, [])

    const fetchDriveStatus = async () => {
        try {
            const response = await axios.get('/api/settings/google-drive')
            setDriveStatus(response.data)

            if (response.data.enabled && !response.data.connected) {
                const authResponse = await axios.get('/api/oauth/google/authorize')
                if (authResponse.data.success) {
                    setAuthUrl(authResponse.data.authUrl)
                }
            }
        } catch (error) {
            console.error('Failed to fetch Drive status:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchScheduleSettings = async () => {
        try {
            const response = await axios.get('/api/settings/backup-schedule')
            if (response.data.success) {
                setScheduleSettings(response.data.settings)
            }
        } catch (error) {
            console.error('Failed to fetch schedule settings:', error)
        }
    }

    const handleUpdateSchedule = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        setUpdateResult(null)

        try {
            const response = await axios.post('/api/settings/backup-schedule', scheduleSettings)
            if (response.data.success) {
                setUpdateResult({
                    success: true,
                    message: 'Schedule updated successfully'
                })
                setTimeout(() => setUpdateResult(null), 3000)
            }
        } catch (error) {
            setUpdateResult({
                success: false,
                message: 'Update failed',
                error: error.message
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleConnect = () => {
        if (authUrl) {
            window.location.href = authUrl
        }
    }

    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect Google Drive?')) return

        try {
            await axios.post('/api/oauth/google/disconnect')
            setTestResult({
                success: true,
                message: 'Disconnected successfully'
            })
            fetchDriveStatus()
        } catch (error) {
            setTestResult({
                success: false,
                message: 'Failed to disconnect',
                error: error.message
            })
        }
    }

    const handleTestConnection = async () => {
        setIsTesting(true)
        setTestResult(null)

        try {
            const response = await axios.post('/api/settings/google-drive/test')
            setTestResult(response.data)
            if (response.data.success) {
                fetchDriveStatus()
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: 'Test failed',
                error: error.message
            })
        } finally {
            setIsTesting(false)
        }
    }

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B'
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
    }

    const getUsagePercentage = () => {
        if (!driveStatus?.quota) return 0
        return ((driveStatus.quota.usage / driveStatus.quota.limit) * 100).toFixed(1)
    }

    if (isLoading) {
        return (
            <div className="settings-loading">
                <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
                <p>Loading settings...</p>
            </div>
        )
    }

    return (
        <div className="settings-container">
            <div className="settings-header">
                <a href="/dashboard" className="btn btn-outline">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                </a>
                <h1>Settings</h1>
            </div>

            <div className="settings-content">
                {/* Google Drive Section */}
                <section className="settings-section glass-dark fade-in">
                    <div className="section-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                    </div>

                    <h2>Google Drive Integration</h2>
                    <p className="section-description">
                        Connect your Google Drive to automatically backup server files and databases.
                    </p>

                    <div className="drive-status-card">
                        <div className="status-row">
                            <span className="status-label">Status:</span>
                            {!driveStatus?.enabled ? (
                                <span className="badge badge-warning">Disabled in Config</span>
                            ) : driveStatus?.connected ? (
                                <span className="badge badge-success">✓ Connected</span>
                            ) : (
                                <span className="badge badge-danger">✗ Not Connected</span>
                            )}
                        </div>

                        {driveStatus?.enabled && !driveStatus?.connected && driveStatus?.error && (
                            <div className="error-box">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle cx="12" cy="12" r="10" strokeWidth={2} />
                                    <line x1="12" y1="8" x2="12" y2="12" strokeWidth={2} strokeLinecap="round" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={2} strokeLinecap="round" />
                                </svg>
                                <span>{driveStatus.error}</span>
                            </div>
                        )}

                        {driveStatus?.connected && driveStatus?.quota && (
                            <div className="quota-info">
                                <h3>Storage Quota</h3>
                                <div className="quota-bar">
                                    <div
                                        className="quota-fill"
                                        style={{ width: `${getUsagePercentage()}%` }}
                                    ></div>
                                </div>
                                <div className="quota-details">
                                    <span>{formatBytes(driveStatus.quota.usage)} used</span>
                                    <span>{formatBytes(driveStatus.quota.limit)} total</span>
                                </div>
                                <p className="quota-percentage">{getUsagePercentage()}% used</p>
                            </div>
                        )}

                        <div className="action-buttons">
                            {driveStatus?.enabled && !driveStatus?.connected && (
                                <button
                                    onClick={handleConnect}
                                    className="btn btn-primary"
                                    disabled={!authUrl}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Connect Google Drive
                                </button>
                            )}

                            {driveStatus?.connected && (
                                <>
                                    <button
                                        onClick={handleTestConnection}
                                        disabled={isTesting}
                                        className="btn btn-primary"
                                    >
                                        {isTesting ? (
                                            <>
                                                <div className="spinner"></div>
                                                Testing...
                                            </>
                                        ) : (
                                            <>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Test Connection
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleDisconnect}
                                        className="btn btn-danger"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Disconnect
                                    </button>
                                </>
                            )}
                        </div>

                        {testResult && (
                            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                                {testResult.success ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                                <span>{testResult.message}</span>
                                {testResult.error && <small className="error-detail">{testResult.error}</small>}
                            </div>
                        )}
                    </div>
                </section>

                {/* Auto-Backup Schedule Section */}
                <section className="settings-section glass-dark fade-in" style={{ marginTop: '2rem' }}>
                    <div className="section-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <h2>Auto-Backup Schedule</h2>
                    <p className="section-description">
                        Configure the automated backup schedule for your databases and files.
                    </p>

                    <form onSubmit={handleUpdateSchedule} className="schedule-form">
                        <div className="form-group">
                            <label className="switch-label">
                                <span>Enable Automated Backup</span>
                                <div className="switch">
                                    <input
                                        type="checkbox"
                                        checked={scheduleSettings.enabled}
                                        onChange={(e) => setScheduleSettings({ ...scheduleSettings, enabled: e.target.checked })}
                                    />
                                    <span className="slider round"></span>
                                </div>
                            </label>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>Backup Frequency (Cron Expression)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={scheduleSettings.cron}
                                    onChange={(e) => setScheduleSettings({ ...scheduleSettings, cron: e.target.value })}
                                    placeholder="e.g. 0 3 * * *"
                                />
                                <small className="input-hint">
                                    Current setting: {scheduleSettings.cron === '0 3 * * *' ? 'Every day at 3:00 AM' : 'Custom schedule'}
                                </small>
                            </div>

                            <div className="form-group">
                                <label>Backup Type</label>
                                <select
                                    className="form-input"
                                    value={scheduleSettings.type}
                                    onChange={(e) => setScheduleSettings({ ...scheduleSettings, type: e.target.value })}
                                >
                                    <option value="both">Both (MySQL & Files)</option>
                                    <option value="mysql">MySQL Databases Only</option>
                                    <option value="files">File System Only</option>
                                </select>
                            </div>
                        </div>

                        <div className="action-buttons" style={{ marginTop: '1.5rem' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="spinner"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                        </svg>
                                        Save Schedule
                                    </>
                                )}
                            </button>
                        </div>

                        {updateResult && (
                            <div className={`test-result ${updateResult.success ? 'success' : 'error'}`} style={{ marginTop: '1rem' }}>
                                <span>{updateResult.message}</span>
                                {updateResult.error && <small className="error-detail">{updateResult.error}</small>}
                            </div>
                        )}
                    </form>
                </section>
            </div>
        </div>
    )
}

export default Settings
