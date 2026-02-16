import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'

// Configure axios defaults
axios.defaults.withCredentials = true

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [user, setUser] = useState(null)

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        try {
            const response = await axios.get('/api/auth/check')
            if (response.data.authenticated) {
                setIsAuthenticated(true)
                setUser(response.data.user)
            }
        } catch (error) {
            console.error('Auth check failed:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogin = (userData) => {
        setIsAuthenticated(true)
        setUser(userData)
    }

    const handleLogout = async () => {
        try {
            await axios.post('/api/auth/logout')
            setIsAuthenticated(false)
            setUser(null)
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
                <p style={{ color: 'var(--gray)' }}>Loading...</p>
            </div>
        )
    }

    return (
        <Router>
            <Routes>
                <Route
                    path="/login"
                    element={
                        isAuthenticated ?
                            <Navigate to="/dashboard" replace /> :
                            <Login onLogin={handleLogin} />
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        isAuthenticated ?
                            <Dashboard user={user} onLogout={handleLogout} /> :
                            <Navigate to="/login" replace />
                    }
                />
                <Route
                    path="/settings"
                    element={
                        isAuthenticated ?
                            <Settings user={user} /> :
                            <Navigate to="/login" replace />
                    }
                />
                <Route
                    path="/"
                    element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
                />
            </Routes>
        </Router>
    )
}

export default App
