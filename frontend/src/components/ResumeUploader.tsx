import React, { useState } from 'react';

interface ResumeUploaderProps {
  onScreeningComplete: (result: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ResumeUploader: React.FC<ResumeUploaderProps> = ({
  onScreeningComplete,
  isLoading,
  setIsLoading,
}) => {
  const [jobDescription, setJobDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !jobDescription) {
      setError('Please provide both a resume and a job description.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_description', jobDescription);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/screen`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to screen resume');
      }

      const result = await response.json();
      onScreeningComplete(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">Screen New Resume</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="jobDescription">Job Description</label>
          <textarea
            id="jobDescription"
            rows={6}
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          ></textarea>
        </div>

        <div className="form-group">
          <label>Resume (PDF or Word)</label>
          <div className="upload-area" onClick={() => document.getElementById('fileInput')?.click()}>
            <div className="upload-icon">📄</div>
            <div className="upload-text">
              {file ? file.name : 'Click to upload or drag and drop'}
            </div>
            <div className="upload-subtext">Supported formats: PDF, DOCX</div>
            <input
              type="file"
              id="fileInput"
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
          {isLoading ? (
            <>
              <div className="spinner" style={{ width: '20px', height: '20px', margin: '0' }}></div>
              Processing...
            </>
          ) : (
            'Analyze Resume'
          )}
        </button>
      </form>
    </div>
  );
};

export default ResumeUploader;
