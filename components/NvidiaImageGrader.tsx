import React, { useState } from 'react';
import './NvidiaImageGrader.css';

interface GradingResult {
  cropName: string;
  grade: string;
  summary: string;
}

const NvidiaImageGrader: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      // Adjust the endpoint as needed
      const response = await fetch('/api/image-grade', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to get grading result');
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nvidia-image-grader-container">
      <h2>NVIDIA Crop Image Grader</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="image-upload">Select image:</label>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          title="Upload crop image"
        />
        <button
          type="submit"
          disabled={!selectedFile || loading}
          className="nvidia-image-grader-btn"
        >
          {loading ? 'Grading...' : 'Grade Image'}
        </button>
      </form>
      {error && <div className="nvidia-image-grader-error">{error}</div>}
      {result && (
        <div className="nvidia-image-grader-result">
          <div><strong>Crop Name:</strong> {result.cropName}</div>
          <div><strong>Grade:</strong> {result.grade}</div>
          <div><strong>Summary:</strong> {result.summary}</div>
        </div>
      )}
    </div>
  );
};

export default NvidiaImageGrader;
