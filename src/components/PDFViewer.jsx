import { useEffect, useState } from 'react'

function PDFViewer({ url, fileName, onClose }) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.95)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .pdf-modal {
          width: 95vw;
          height: 95vh;
          border-radius: 12px;
        }
        @media (max-width: 768px) {
          .pdf-modal {
            width: 96vw;
            height: 96vh;
            border-radius: 6px;
          }
        }
        @media (max-width: 480px) {
          .pdf-modal {
            width: 100vw;
            height: 100vh;
            border-radius: 0;
          }
        }
        .pdf-iframe-wrap {
          height: calc(95vh - 56px);
        }
        @media (max-width: 768px) {
          .pdf-iframe-wrap {
            height: calc(96vh - 56px);
          }
        }
        @media (max-width: 480px) {
          .pdf-iframe-wrap {
            height: calc(100vh - 56px);
          }
        }
      `}</style>

      <div
        className="pdf-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: 'white',
            height: '56px',
            minHeight: '56px',
            flexShrink: 0,
            padding: '0 16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <p
            style={{
              fontSize: '15px',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {fileName}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: '600',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                textDecoration: 'none',
                minHeight: '36px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Download
            </a>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '22px',
                color: '#6b7280',
                lineHeight: 1,
                padding: '4px 8px',
                minWidth: '36px',
                minHeight: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* PDF iframe area */}
        <div
          className="pdf-iframe-wrap"
          style={{ flex: 1, position: 'relative', overflow: 'hidden', width: '100%' }}
        >
          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f9fafb',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #e5e7eb',
                  borderTop: '4px solid #2563eb',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            </div>
          )}
          <iframe
            src={url}
            width="100%"
            height="100%"
            style={{ border: 'none', display: 'block' }}
            title={fileName}
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
    </div>
  )
}

export default PDFViewer
