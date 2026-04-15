import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import './Editor.css'

interface Document {
  id: string
  title: string
  content: string
  updated_at: string
}

interface EditorProps {
  userId: string
  onLogout: () => void
}

export function Editor({ userId, onLogout }: EditorProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, content, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
      if (data && data.length > 0) {
        loadDocument(data[0])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadDocument = (doc: Document) => {
    setCurrentDoc(doc)
    setTitle(doc.title)
    setContent(doc.content)
  }

  const saveDocument = async (docId: string, newTitle: string, newContent: string) => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('documents')
        .update({
          title: newTitle,
          content: newContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId)
        .eq('user_id', userId)

      if (error) throw error
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    if (currentDoc) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        saveDocument(currentDoc.id, newTitle, content)
      }, 500)
    }
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    if (currentDoc) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        saveDocument(currentDoc.id, title, newContent)
      }, 500)
    }
  }

  const createNewDocument = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          title: 'Untitled Document',
          content: '',
        })
        .select()

      if (error) throw error
      if (data && data.length > 0) {
        const newDoc = data[0]
        setDocuments([newDoc, ...documents])
        loadDocument(newDoc)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const deleteDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId)
        .eq('user_id', userId)

      if (error) throw error
      setDocuments(documents.filter(d => d.id !== docId))
      if (currentDoc?.id === docId) {
        if (documents.length > 1) {
          const next = documents.find(d => d.id !== docId)
          if (next) loadDocument(next)
        } else {
          setCurrentDoc(null)
          setTitle('')
          setContent('')
        }
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="editor-layout">
      <header className="editor-header">
        <div className="header-left">
          <h1 className="app-title">Editor</h1>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </header>

      <div className="editor-container">
        <aside className="sidebar">
          <button className="new-doc-btn" onClick={createNewDocument}>
            + New Document
          </button>
          <nav className="documents-list">
            {documents.length === 0 ? (
              <p className="empty-state">No documents yet</p>
            ) : (
              documents.map(doc => (
                <div
                  key={doc.id}
                  className={`doc-item ${currentDoc?.id === doc.id ? 'active' : ''}`}
                >
                  <button
                    className="doc-link"
                    onClick={() => loadDocument(doc)}
                  >
                    <span className="doc-title">{doc.title}</span>
                    <span className="doc-time">
                      {new Date(doc.updated_at).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => deleteDocument(doc.id)}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </nav>
        </aside>

        <main className="editor-main">
          {error && (
            <div className="error-banner">
              {error}
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          {currentDoc ? (
            <>
              <input
                type="text"
                className="doc-title-input"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Document title"
              />
              <textarea
                className="doc-editor"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Start typing..."
              />
              {saving && <div className="save-indicator">Saving...</div>}
            </>
          ) : (
            <div className="no-document">
              <p>No document selected</p>
              <button onClick={createNewDocument} className="create-btn">
                Create your first document
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
