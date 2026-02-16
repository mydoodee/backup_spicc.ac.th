import './HistoryTable.css'

function HistoryTable({ backups, isLoading, pagination, onPageChange }) {
    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date)
    }

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A'
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
    }

    const handleDownload = (id) => {
        window.open(`/api/backup/download/${id}`, '_blank')
    }

    if (isLoading) {
        return (
            <div className="history-loading">
                <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
                <p>Loading backup history...</p>
            </div>
        )
    }

    if (backups.length === 0) {
        return (
            <div className="history-empty glass-dark">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3>No Backups Yet</h3>
                <p>Start by creating your first backup using the controls above</p>
            </div>
        )
    }

    return (
        <div className="history-table-container glass-dark">
            <div className="table-wrapper">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Filename</th>
                            <th>Size</th>
                            <th>Status</th>
                            <th>Created By</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {backups.map((backup) => (
                            <tr key={backup.id}>
                                <td>
                                    <span className={`badge badge-${backup.backup_type === 'mysql' ? 'info' : 'warning'}`}>
                                        {backup.backup_type === 'mysql' ? '🗄️ MySQL' : '📁 Files'}
                                    </span>
                                </td>
                                <td className="filename-cell">
                                    <span className="filename" title={backup.filename}>
                                        {backup.filename}
                                    </span>
                                </td>
                                <td>{formatFileSize(backup.file_size)}</td>
                                <td>
                                    <span className={`badge badge-${backup.status === 'success' ? 'success' : 'danger'}`}>
                                        {backup.status}
                                    </span>
                                </td>
                                <td>{backup.username || 'Unknown'}</td>
                                <td className="date-cell">{formatDate(backup.created_at)}</td>
                                <td>
                                    {backup.status === 'success' ? (
                                        <button
                                            onClick={() => handleDownload(backup.id)}
                                            className="btn-download"
                                            title="Download backup"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            <span>Download</span>
                                        </button>
                                    ) : (
                                        <span className="text-muted" title={backup.error_message}>Failed</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
                <div className="pagination-controls">
                    <button
                        className="btn-icon"
                        disabled={pagination.page === 1}
                        onClick={() => onPageChange(pagination.page - 1)}
                        title="Previous Page"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="pagination-numbers">
                        {[...Array(pagination.totalPages)].map((_, i) => {
                            const pageNum = i + 1;
                            // Show first, last, current, and surrounding pages
                            if (
                                pageNum === 1 ||
                                pageNum === pagination.totalPages ||
                                (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                            ) {
                                return (
                                    <button
                                        key={pageNum}
                                        className={`btn-page ${pagination.page === pageNum ? 'active' : ''}`}
                                        onClick={() => onPageChange(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            } else if (
                                (pageNum === pagination.page - 2 && pageNum > 1) ||
                                (pageNum === pagination.page + 2 && pageNum < pagination.totalPages)
                            ) {
                                return <span key={pageNum} className="pagination-dots">...</span>;
                            }
                            return null;
                        })}
                    </div>

                    <button
                        className="btn-icon"
                        disabled={pagination.page === pagination.totalPages}
                        onClick={() => onPageChange(pagination.page + 1)}
                        title="Next Page"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    )
}

export default HistoryTable
