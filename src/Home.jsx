import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabase'

export function Home() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadUserFiles()
  }, [])

  const loadUserFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('hex_explorer')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFiles(data)
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewFile = () => {
    navigate('/app')
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  return (
    <div className="home-container">
      <div className="title-bar">
        <Link to="/" className="title">
          HEX<span className="highlight-green">Plore</span>
          <span className="cursor-block">█</span>
        </Link>
        <button onClick={handleNewFile} className="new-file-button">
          New File
        </button>
      </div>

      <div className="files-container">
        <h2>Your Files</h2>
        {loading ? (
          <div className="loading">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="no-files">
            <p>You haven't uploaded any files yet.</p>
            <button onClick={handleNewFile}>Upload your first file</button>
          </div>
        ) : (
          <div className="files-grid">
            {files.map(file => (
              <Link 
                key={file.id} 
                to={`/shared/${file.id}`}
                className="file-card"
              >
                <div className="file-icon">📄</div>
                <div className="file-info">
                  <div className="file-name">{file.filename}</div>
                  <div className="file-date">Created: {formatDate(file.created_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 