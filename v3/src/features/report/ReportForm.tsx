'use client';

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { AcademicInputSchema } from '@/lib/validation/input';
import type { AcademicInput } from '@/lib/validation/input';
import type { ReportSnapshot } from '@/lib/types/report';

interface ReportFormProps {
  onGenerate: (report: ReportSnapshot) => void;
  initialReport?: ReportSnapshot | null;
}

export function ReportForm({ onGenerate, initialReport }: ReportFormProps) {
  const [formData, setFormData] = useState<AcademicInput>(() => ({
    academicYear: '2022-23',
    semester: 3,
    subjectName: '',
    subjectCode: '',
    facultyName: '',
    period: 'MID',
  }));
  
  const [errors, setErrors] = useState<Partial<Record<keyof AcademicInput, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialReportRef = useRef<ReportSnapshot | null>(null);

  // Sync form data with initialReport prop changes using ref to avoid effect warning
  useEffect(() => {
    if (initialReport && initialReport !== initialReportRef.current) {
      initialReportRef.current = initialReport;
      setFormData({
        academicYear: initialReport.academic.academicYear,
        semester: initialReport.academic.semester,
        subjectName: initialReport.academic.subjectName,
        subjectCode: initialReport.academic.subjectCode,
        facultyName: initialReport.academic.facultyName,
        period: initialReport.period,
      });
    }
  }, [initialReport]);

  const validateField = (name: keyof AcademicInput, value: string | number): string | null => {
    const testData = { ...formData, [name]: value };
    const result = AcademicInputSchema.safeParse(testData);
    if (!result.success) {
      return result.error.errors[0].message;
    }
    return null;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const typedValue = name === 'semester' ? parseInt(value, 10) : value;
    setFormData(prev => ({ ...prev, [name]: typedValue }));
    
    const error = validateField(name as keyof AcademicInput, typedValue);
    setErrors(prev => ({ ...prev, [name]: error || undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const result = AcademicInputSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof AcademicInput, string>> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof AcademicInput] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate report');
      }
      const report = await res.json();
      onGenerate(report);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-body" noValidate>
      <div className="fields">
        <div className="field">
          <label htmlFor="academic_year">Academic year / Batch *</label>
          <input
            id="academic_year"
            name="academic_year"
            type="text"
            placeholder="2022-23"
            pattern="[0-9]{4}-([0-9]{2}|[0-9]{4})"
            value={formData.academicYear}
            onChange={handleChange}
            required
            aria-invalid={!!errors.academicYear}
            aria-describedby={errors.academicYear ? 'academic_year-error' : undefined}
          />
          <small>Example: 2022-23</small>
          {errors.academicYear && (
            <span id="academic_year-error" className="error-text" style={{ color: '#dc2626', fontSize: '11px' }}>
              {errors.academicYear}
            </span>
          )}
        </div>
        
        <div className="field">
          <label htmlFor="department">Department / Branch</label>
          <input
            id="department"
            name="department"
            type="text"
            value="Automation and Robotics"
            readOnly
            aria-label="Department (fixed)"
          />
          <small>Preconfigured department</small>
        </div>
        
        <div className="field">
          <label htmlFor="semester">Semester *</label>
          <select
            id="semester"
            name="semester"
            value={formData.semester}
            onChange={handleChange}
            required
            aria-invalid={!!errors.semester}
            aria-describedby={errors.semester ? 'semester-error' : undefined}
          >
            <option value="">Select semester</option>
            <option value="1">Semester I</option>
            <option value="2">Semester II</option>
            <option value="3">Semester III</option>
            <option value="4">Semester IV</option>
            <option value="5">Semester V</option>
            <option value="6">Semester VI</option>
            <option value="7">Semester VII</option>
            <option value="8">Semester VIII</option>
          </select>
          {errors.semester && (
            <span id="semester-error" className="error-text" style={{ color: '#dc2626', fontSize: '11px' }}>
              {errors.semester}
            </span>
          )}
        </div>
        
        <div className="field">
          <label htmlFor="subject_name">Subject name *</label>
          <input
            id="subject_name"
            name="subject_name"
            type="text"
            placeholder="e.g. Engineering Mathematics - III"
            maxLength={120}
            value={formData.subjectName}
            onChange={handleChange}
            required
            aria-invalid={!!errors.subjectName}
            aria-describedby={errors.subjectName ? 'subject_name-error' : undefined}
          />
          {errors.subjectName && (
            <span id="subject_name-error" className="error-text" style={{ color: '#dc2626', fontSize: '11px' }}>
              {errors.subjectName}
            </span>
          )}
        </div>
        
        <div className="field">
          <label htmlFor="subject_code">Subject code *</label>
          <input
            id="subject_code"
            name="subject_code"
            type="text"
            placeholder="e.g. 25AF1000BS305"
            maxLength={120}
            value={formData.subjectCode}
            onChange={handleChange}
            required
            aria-invalid={!!errors.subjectCode}
            aria-describedby={errors.subjectCode ? 'subject_code-error' : undefined}
          />
          {errors.subjectCode && (
            <span id="subject_code-error" className="error-text" style={{ color: '#dc2626', fontSize: '11px' }}>
              {errors.subjectCode}
            </span>
          )}
        </div>
        
        <div className="field">
          <label htmlFor="faculty_name">Faculty name *</label>
          <input
            id="faculty_name"
            name="faculty_name"
            type="text"
            placeholder="e.g. Prof. S. S. Borse"
            maxLength={120}
            value={formData.facultyName}
            onChange={handleChange}
            required
            aria-invalid={!!errors.facultyName}
            aria-describedby={errors.facultyName ? 'faculty_name-error' : undefined}
          />
          {errors.facultyName && (
            <span id="faculty_name-error" className="error-text" style={{ color: '#dc2626', fontSize: '11px' }}>
              {errors.facultyName}
            </span>
          )}
        </div>
        
        <div className="field">
          <label htmlFor="period">Feedback Period *</label>
          <select
            id="period"
            name="period"
            value={formData.period}
            onChange={handleChange}
            required
            aria-invalid={!!errors.period}
            aria-describedby={errors.period ? 'period-error' : undefined}
          >
            <option value="MID">Mid Semester</option>
            <option value="END">End Semester</option>
          </select>
          {errors.period && (
            <span id="period-error" className="error-text" style={{ color: '#dc2626', fontSize: '11px' }}>
              {errors.period}
            </span>
          )}
        </div>
      </div>
      
      <div className="form-actions">
        <button
          type="button"
          className="btn secondary"
          onClick={() => setFormData({
            academicYear: '2022-23',
            semester: 3,
            subjectName: '',
            subjectCode: '',
            facultyName: '',
            period: 'MID',
          })}
          disabled={isSubmitting}
        >
          Clear fields
        </button>
        <button
          type="submit"
          className="btn primary"
          disabled={isSubmitting}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M5 3h10l4 4v14H5zM15 3v5h5M8 13h8M8 17h6" />
          </svg>
          {isSubmitting ? 'Generating…' : 'Generate report'}
        </button>
      </div>
    </form>
  );
}