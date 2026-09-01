import { useState } from 'react';
import './index.css';

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [photos, setPhotos] = useState([]);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/')
      );
      
      const newPhotos = filesArray.map(file => ({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        path: file.path,
        url: URL.createObjectURL(file)
      }));
      
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const newPhotos = filesArray.map(file => ({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        path: file.path,
        url: URL.createObjectURL(file)
      }));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Photo Print Assistant</h1>
        <p>Acomodá tus fotos para imprimir fácilmente</p>
      </header>

      <main className="main-content">
        {photos.length === 0 ? (
          <div 
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <div className="drop-zone-content">
              <span className="icon">📸</span>
              <h2>Arrastrá y soltá tus fotos aquí</h2>
              <p>O hacé clic para buscar en Descargas</p>
              <input 
                id="file-upload" 
                type="file" 
                multiple 
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileSelect}
                style={{ display: 'none' }} 
              />
            </div>
          </div>
        ) : (
          <div className="gallery">
            <div className="gallery-header">
              <h2>Fotos Cargadas ({photos.length})</h2>
              <button className="btn-primary" onClick={() => document.getElementById('file-upload-more').click()}>
                Agregar más fotos
              </button>
              <input 
                id="file-upload-more" 
                type="file" 
                multiple 
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileSelect}
                style={{ display: 'none' }} 
              />
            </div>
            <div className="photo-grid">
              {photos.map(photo => (
                <div key={photo.id} className="photo-card">
                  <img src={photo.url} alt={photo.name} />
                  <div className="photo-info">
                    <span className="photo-name">{photo.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
