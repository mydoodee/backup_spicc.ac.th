import { useState } from 'react'
import axios from 'axios'
import './BackupCard.css'

function BackupCard({ title, description, icon, type, onBackupComplete }) {
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState(null)
    const [message, setMessage] = useState('')

    const handleBackup = async () => {
        setIsLoading(true)
        setStatus(null)
        setMessage('')

        try {
            const response = await axios.post(`/api/backup/${type}`)

            if (response.data.success) {
                setStatus('success')
                setMessage(`Backup completed: ${response.data.filename}`)
                if (onBackupComplete) {
                    onBackupComplete()
                }
            }
        } catch (error) {
            setStatus('error')
            setMessage(error.response?.data?.message || 'Backup failed')
        } finally {
            setIsLoading(false)
            // Clear message after 5 seconds
            setTimeout(() => {
                setStatus(null)
                setMessage('')
            }, 5000)
        }
    }

    return (
        <div className="backup-card card">
            <div className="backup-card-header">
                <div className="backup-icon">
                    {icon}
                </div>
                <div className="backup-info">
                    <h3>{title}</h3>
                    <p>{description}</p>
                </div>
            </div>

            <div className="backup-card-body">
                {status && (
                    <div className={`backup-message ${status}`}>
                        {status === 'success' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        <span>{message}</span>
                    </div>
                )}

                <button
                    onClick={handleBackup}
                    disabled={isLoading}
                    className="btn btn-success btn-backup"
                >
                    {isLoading ? (
                        <>
                            <div className="spinner"></div>
                            Processing...
                        </>
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Backup Now
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}

export default BackupCard
