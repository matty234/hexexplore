import { useState, useCallback, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import ReactMarkdown from 'react-markdown'
import { supabase } from './supabase'
import './App.css'

function Auth({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setError('Check your email for the confirmation link')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        <button 
          className="auth-toggle" 
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </button>
      </div>
    </div>
  )
}

function Comment({ range, comment, isActive, onClick }) {
  return (
    <div 
      id={`comment-${range}`}
      className={`comment ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="comment-offset">
        <span>Offset: 0x{range}</span>
        <button 
          className="copy-link"
          onClick={(e) => {
            e.stopPropagation();
            const url = new URL(window.location.href);
            url.hash = `comment-${range}`;
            navigator.clipboard.writeText(url.toString());
          }}
          title="Copy link to comment"
        >
          #
        </button>
      </div>
      <div className="comment-text">
        <ReactMarkdown>{comment}</ReactMarkdown>
      </div>
    </div>
  );
}

function CommentOverlay({ start, end, onSubmit, onCancel }) {
  const [comment, setComment] = useState('')
  const [isPreview, setIsPreview] = useState(false)
  const inputRef = useRef(null)
  const formRef = useRef(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    inputRef.current?.focus()

    const lastSelected = document.querySelector(`.hex[data-offset="${end}"]`)
    if (lastSelected && formRef.current) {
      const rect = lastSelected.getBoundingClientRect()
      const formRect = formRef.current.getBoundingClientRect()
      
      let left = rect.right + 10
      let top = rect.top

      if (left + formRect.width > window.innerWidth - 20) {
        left = rect.left - formRect.width - 10
      }

      if (top + formRect.height > window.innerHeight - 20) {
        top = window.innerHeight - formRect.height - 20
      }

      top = Math.max(20, top)
      setPosition({ top, left })
    }
  }, [end])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (comment.trim()) {
      onSubmit(comment)
      setComment('')
    }
  }

  return (
    <div className="comment-overlay" onClick={onCancel}>
      <form 
        ref={formRef}
        onSubmit={handleSubmit} 
        className="comment-form"
        style={{ 
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="comment-form-arrow" />
        <div className="comment-form-header">
          <h3>Add Comment</h3>
          <div className="comment-form-tabs">
            <button
              type="button"
              className={!isPreview ? 'active' : ''}
              onClick={() => setIsPreview(false)}
            >
              Edit
            </button>
            <button
              type="button"
              className={isPreview ? 'active' : ''}
              onClick={() => setIsPreview(true)}
            >
              Preview
            </button>
          </div>
        </div>
        <p className="comment-range">Offset: 0x{start}-0x{end}</p>
        {isPreview ? (
          <div className="comment-preview">
            <ReactMarkdown>{comment}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={inputRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your comment... (Markdown supported)"
            rows={3}
          />
        )}
        <div className="comment-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={!comment.trim()}>Save</button>
        </div>
      </form>
    </div>
  )
}

function SelectionInfoBar({ 
  selectedBytes, 
  onEndianChange, 
  onTypeChange,
  endian = 'little',
  valueType = 'unsigned'
}) {
  const interpretValue = () => {
    if (!selectedBytes || !selectedBytes.length) {
      return 'No selection';
    }

    const bytes = endian === 'little' ? [...selectedBytes].reverse() : selectedBytes;
    const byteArray = new Uint8Array(bytes);
    const dataView = new DataView(byteArray.buffer);

    try {
      switch (selectedBytes.length) {
        case 1:
          return valueType === 'unsigned' ? dataView.getUint8(0) : dataView.getInt8(0);
        case 2:
          return valueType === 'unsigned' 
            ? dataView.getUint16(0, endian === 'little')
            : dataView.getInt16(0, endian === 'little');
        case 4:
          return valueType === 'unsigned'
            ? dataView.getUint32(0, endian === 'little')
            : dataView.getInt32(0, endian === 'little');
        case 8:
          const bigInt = valueType === 'unsigned'
            ? dataView.getBigUint64(0, endian === 'little')
            : dataView.getBigInt64(0, endian === 'little');
          return bigInt.toString();
        default:
          return 'Select 1, 2, 4, or 8 bytes for numeric interpretation';
      }
    } catch (e) {
      return 'Invalid selection for numeric interpretation';
    }
  }

  return (
    <div className="selection-info-bar">
      <div className="selection-controls">
        <label>
          <input
            type="radio"
            name="endian"
            value="little"
            checked={endian === 'little'}
            onChange={(e) => onEndianChange(e.target.value)}
          />
          Little Endian
        </label>
        <label>
          <input
            type="radio"
            name="endian"
            value="big"
            checked={endian === 'big'}
            onChange={(e) => onEndianChange(e.target.value)}
          />
          Big Endian
        </label>
        <div className="separator" />
        <label>
          <input
            type="radio"
            name="type"
            value="unsigned"
            checked={valueType === 'unsigned'}
            onChange={(e) => onTypeChange(e.target.value)}
          />
          Unsigned
        </label>
        <label>
          <input
            type="radio"
            name="type"
            value="signed"
            checked={valueType === 'signed'}
            onChange={(e) => onTypeChange(e.target.value)}
          />
          Signed
        </label>
      </div>
      <div className="selection-info">
        <div className="selection-length">
          {selectedBytes ? `Selected: ${selectedBytes.length} byte${selectedBytes.length !== 1 ? 's' : ''}` : 'No selection'}
        </div>
        <div className="selection-value">
          Value: {interpretValue()}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null)
  const [file, setFile] = useState(null)
  const [hexData, setHexData] = useState([])
  const [comments, setComments] = useState({})
  const [selectionStart, setSelectionStart] = useState(null)
  const [selectionEnd, setSelectionEnd] = useState(null)
  const [highlightedRange, setHighlightedRange] = useState(null)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 })
  const [shareId, setShareId] = useState(null)
  const [bytesPerRow, setBytesPerRow] = useState(16)
  const [isDragging, setIsDragging] = useState(false)
  const [showCommentOverlay, setShowCommentOverlay] = useState(false)
  const [fileOwner, setFileOwner] = useState(null)
  const [endian, setEndian] = useState('little')
  const [valueType, setValueType] = useState('unsigned')
  const hexViewRef = useRef(null)
  const ROW_HEIGHT = 18
  const BUFFER_ROWS = 10

  useEffect(() => {
    // Check for current session
    const data = supabase.auth.getSession()
    setUser(data?.user ?? null)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const calculateBytesPerRow = () => {
      const hexView = hexViewRef.current;
      if (!hexView) return;

      // Force a reflow to get accurate width
      void hexView.offsetWidth;

      const containerWidth = hexView.clientWidth;
      
      // Character widths in pixels (for monospace font)
      const charWidth = 7;
      
      // Fixed widths
      const offsetWidth = 70;  // Offset column (8 chars + padding)
      const separatorWidth = 40;  // Gaps between sections
      const scrollbarWidth = 20;
      
      // Available width for byte columns
      const availableWidth = containerWidth - offsetWidth - separatorWidth - scrollbarWidth;
      
      // Width needed per byte (hex + binary + ascii)
      const byteDisplayWidth = (
        (3 * charWidth) +     // Hex: 2 chars + 1 space
        (9 * charWidth) +     // Binary: 8 chars + 1 space
        charWidth             // ASCII: 1 char
      );

      // Calculate how many bytes can fit
      const maxBytes = Math.floor(availableWidth / byteDisplayWidth);
      
      // Round down to nearest multiple of 4, minimum of 4 bytes
      const newBytesPerRow = Math.max(4, Math.floor(maxBytes / 4) * 4);
      
      if (newBytesPerRow !== bytesPerRow) {
        setBytesPerRow(newBytesPerRow);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(calculateBytesPerRow);
    });

    if (hexViewRef.current) {
      resizeObserver.observe(hexViewRef.current);
      calculateBytesPerRow();
    }

    return () => resizeObserver.disconnect();
  }, [bytesPerRow]);

  useEffect(() => {
    const loadSharedFile = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const id = urlParams.get('id')
      if (id) {
        await loadFromShare(id)
      }
    }
    loadSharedFile()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (!hexViewRef.current) return
      const { scrollTop, clientHeight } = hexViewRef.current
      const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS)
      const visibleRows = Math.ceil(clientHeight / ROW_HEIGHT) + 2 * BUFFER_ROWS
      const endRow = Math.min(Math.ceil(hexData.length / bytesPerRow), startRow + visibleRows)
      
      setVisibleRange({
        start: startRow * bytesPerRow,
        end: endRow * bytesPerRow
      })
    }

    const hexView = hexViewRef.current
    if (hexView) {
      hexView.addEventListener('scroll', handleScroll)
      handleScroll()
    }

    return () => {
      if (hexView) {
        hexView.removeEventListener('scroll', handleScroll)
      }
    }
  }, [hexData.length, bytesPerRow])

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      const buffer = await file.arrayBuffer()
      const bytes = Array.from(new Uint8Array(buffer))
      setHexData(bytes)
      setFile(file)
      setComments({})
      setShareId(null)
    } catch (error) {
      console.error('Error loading file:', error)
      alert('Error loading file')
    }
  }

  const handleMouseDown = (offset, e) => {
    e.preventDefault()
    setHighlightedRange(null)
    setSelectionStart(offset)
    setSelectionEnd(offset)
    setIsDragging(true)
    setShowCommentOverlay(false)
  }

  const handleMouseMove = (offset) => {
    if (isDragging && selectionStart !== null) {
      setSelectionEnd(offset)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false);
  }

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mouseleave', handleMouseUp)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseleave', handleMouseUp)
    }
  }, [isDragging, selectionStart, selectionEnd])

  const handleCommentSubmit = async (comment) => {
    if (!user) {
      alert('Please sign in to add comments')
      return
    }

    if (fileOwner && fileOwner !== user.id) {
      alert('Only the file owner can add comments')
      return
    }

    const start = Math.min(selectionStart, selectionEnd)
    const end = Math.max(selectionStart, selectionEnd)
    const newComments = {
      ...comments,
      [`${start}-${end}`]: comment
    }
    
    if (shareId) {
      const { error } = await supabase
        .from('hex_explorer')
        .update({ comments: newComments })
        .eq('id', shareId)

      if (error) {
        alert('Error saving comment')
        return
      }
    }
    
    setComments(newComments)
    setShowCommentOverlay(false)
    setSelectionStart(null)
    setSelectionEnd(null)
  }

  const handleCommentCancel = () => {
    setShowCommentOverlay(false)
    setSelectionStart(null)
    setSelectionEnd(null)
  }

  const shareFile = async () => {
    if (!file || !hexData.length || !user) return

    try {
      const id = uuidv4()
      
      const { error: uploadError } = await supabase
        .storage
        .from('hex-files')
        .upload(`${id}/data.bin`, new Uint8Array(hexData).buffer)

      if (uploadError) throw uploadError

      const { error: insertError } = await supabase
        .from('hex_explorer')
        .insert({
          id,
          filename: file.name,
          comments,
          created_at: new Date().toISOString(),
          user_id: user.id
        })

      if (insertError) throw insertError

      setShareId(id)
      setFileOwner(user.id)
      const shareUrl = `${window.location.origin}?id=${id}`
      await navigator.clipboard.writeText(shareUrl)
      alert('Share URL copied to clipboard!')
    } catch (error) {
      console.error('Error sharing file:', error)
      alert('Error sharing file')
    }
  }

  const loadFromShare = async (id) => {
    try {
      const { data: metadata, error: metadataError } = await supabase
        .from('hex_explorer')
        .select('*')
        .eq('id', id)
        .single()

      if (metadataError) throw metadataError

      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('hex-files')
        .download(`${id}/data.bin`)

      if (downloadError) throw downloadError

      const buffer = await fileData.arrayBuffer()
      const bytes = Array.from(new Uint8Array(buffer))

      setHexData(bytes)
      setFile({ name: metadata.filename })
      setComments(metadata.comments)
      setShareId(id)
      setFileOwner(metadata.user_id)
    } catch (error) {
      console.error('Error loading shared file:', error)
      alert('Error loading shared file')
    }
  }

  const isSelected = (offset) => {
    if (selectionStart === null) return false
    const start = Math.min(selectionStart, selectionEnd || selectionStart)
    const end = Math.max(selectionStart, selectionEnd || selectionStart)
    return offset >= start && offset <= end
  }

  const isHighlighted = (offset) => {
    if (!highlightedRange) return false
    const [start, end] = highlightedRange.split('-').map(Number)
    return offset >= start && offset <= end
  }

  const hasCommentInRange = (rowStart, rowEnd) => {
    return Object.keys(comments).some(range => {
      const [start, end] = range.split('-').map(Number)
      return (start <= rowEnd && end >= rowStart)
    })
  }

  const handleCommentClick = (range) => {
    setHighlightedRange(range)
    setSelectionStart(null)
    setSelectionEnd(null)

    const [start] = range.split('-').map(Number)
    const rowIndex = Math.floor(start / bytesPerRow)
    if (hexViewRef.current) {
      hexViewRef.current.scrollTop = rowIndex * ROW_HEIGHT
    }
  }

  const renderHexRows = useCallback(() => {
    const totalRows = Math.ceil(hexData.length / bytesPerRow)
    const startRow = Math.floor(visibleRange.start / bytesPerRow)
    const endRow = Math.ceil(visibleRange.end / bytesPerRow)
    
    const topSpacer = startRow * ROW_HEIGHT
    const bottomSpacer = (totalRows - endRow) * ROW_HEIGHT

    const rows = []
    for (let i = visibleRange.start; i < visibleRange.end; i += bytesPerRow) {
      const rowBytes = hexData.slice(i, i + bytesPerRow)
      const rowEnd = Math.min(i + bytesPerRow - 1, hexData.length - 1)
      const hasComment = hasCommentInRange(i, rowEnd)
      
      rows.push(
        <div key={i} className={`hex-row ${hasComment ? 'has-comment' : ''}`}>
          <span className="offset">{i.toString(16).padStart(8, '0')}</span>
          <div className="hex-values">
            {rowBytes.map((byte, index) => (
              <span
                key={i + index}
                data-offset={i + index}
                className={`hex ${isSelected(i + index) ? 'selected' : ''} ${isHighlighted(i + index) ? 'highlighted' : ''}`}
                onMouseDown={(e) => handleMouseDown(i + index, e)}
                onMouseMove={() => handleMouseMove(i + index)}
                title="Click and drag to select"
              >
                {byte.toString(16).padStart(2, '0')}
              </span>
            ))}
            {[...Array(bytesPerRow - rowBytes.length)].map((_, index) => (
              <span key={`pad-${index}`} className="hex pad">{'  '}</span>
            ))}
          </div>
          <div className="binary-values">
            {rowBytes.map((byte, index) => (
              <span
                key={i + index}
                data-offset={i + index}
                className={`binary ${isSelected(i + index) ? 'selected' : ''} ${isHighlighted(i + index) ? 'highlighted' : ''}`}
                onMouseDown={(e) => handleMouseDown(i + index, e)}
                onMouseMove={() => handleMouseMove(i + index)}
                title="Click and drag to select"
              >
                {byte.toString(2).padStart(8, '0')}
              </span>
            ))}
            {[...Array(bytesPerRow - rowBytes.length)].map((_, index) => (
              <span key={`pad-${index}`} className="binary pad">{'        '}</span>
            ))}
          </div>
          <div className="ascii-values">
            {rowBytes.map((byte, index) => (
              <span
                key={i + index}
                data-offset={i + index}
                className={`ascii ${isSelected(i + index) ? 'selected' : ''} ${isHighlighted(i + index) ? 'highlighted' : ''}`}
                onMouseDown={(e) => handleMouseDown(i + index, e)}
                onMouseMove={() => handleMouseMove(i + index)}
                title="Click and drag to select"
              >
                {byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'}
              </span>
            ))}
          </div>
        </div>
      )
    }

    return (
      <>
        <div style={{ height: topSpacer }} />
        {rows}
        <div style={{ height: bottomSpacer }} />
      </>
    )
  }, [hexData, selectionStart, selectionEnd, comments, highlightedRange, visibleRange, bytesPerRow, isDragging])

  const getSelectedBytes = () => {
    if (selectionStart === null || selectionEnd === null) return null;
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    return hexData.slice(start, end + 1);
  }

  useEffect(() => {
    // Handle URL fragment for comment highlighting
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#comment-')) {
        const range = hash.replace('#comment-', '');
        const [start, end] = range.split('-').map(Number);
        
        // Highlight the comment
        setHighlightedRange(range);
        
        // Scroll to the bytes
        const rowIndex = Math.floor(start / bytesPerRow);
        if (hexViewRef.current) {
          hexViewRef.current.scrollTop = rowIndex * ROW_HEIGHT;
        }

        // Scroll the comment into view
        document.getElementById(`comment-${range}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Handle initial hash
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [bytesPerRow]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() === 'c' && selectionStart !== null && selectionEnd !== null) {
        setShowCommentOverlay(true);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [selectionStart, selectionEnd]);

  return (
    <div className="app-container">
      <div className="title-bar">
        <div className="title">
          HEX<span className="highlight">Plore</span>
          <span className="cursor">█</span>
        </div>
        <div className="auth-status">
          {user ? (
            <div className="user-info">
              <span>{user.email}</span>
              <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
            </div>
          ) : (
            <button onClick={() => setShowCommentOverlay(false)}>Sign In</button>
          )}
        </div>
      </div>

      {!user ? (
        <Auth />
      ) : (
        <>
          <div className="header">
            <div className="file-controls">
              <input
                type="file"
                onChange={handleFileUpload}
                className="file-input"
              />
              {file && <span className="filename">{file.name}</span>}
            </div>
            <div className="comment-controls">
              <button onClick={shareFile} disabled={!file || !hexData.length}>
                Share File
              </button>
              {shareId && (
                <span className="share-info">
                  Share ID: {shareId}
                </span>
              )}
            </div>
          </div>
          
          <div className="main-content">
            <div className="hex-view" ref={hexViewRef}>
              {renderHexRows()}
            </div>
            
            <div className="comments-sidebar">
              <h3>Comments</h3>
              {Object.entries(comments).map(([range, comment]) => (
                <Comment
                  key={range}
                  range={range}
                  comment={comment}
                  isActive={range === highlightedRange}
                  onClick={() => handleCommentClick(range)}
                />
              ))}
            </div>
          </div>

          <SelectionInfoBar
            selectedBytes={getSelectedBytes()}
            endian={endian}
            valueType={valueType}
            onEndianChange={setEndian}
            onTypeChange={setValueType}
          />

          {selectionStart !== null && selectionEnd !== null && !showCommentOverlay && (
            <div className="keyboard-hint">
              Press 'c' to add a comment
              {fileOwner && fileOwner !== user.id && (
                <span className="hint-warning">
                  (View only - not your file)
                </span>
              )}
            </div>
          )}

          {showCommentOverlay && selectionStart !== null && selectionEnd !== null && (
            <CommentOverlay
              start={Math.min(selectionStart, selectionEnd)}
              end={Math.max(selectionStart, selectionEnd)}
              onSubmit={handleCommentSubmit}
              onCancel={handleCommentCancel}
            />
          )}
        </>
      )}
    </div>
  )
}

export default App
