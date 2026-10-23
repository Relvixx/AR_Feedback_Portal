'use client';

import { useState, useEffect, useRef, FormEvent, MouseEvent, ChangeEvent } from 'react';
import { AcademicInputSchema } from '@/lib/validation/input';
import type { AcademicInput } from '@/lib/validation/input';
import type { ReportSnapshot, FeedbackPeriod } from '@/lib/types/report';

interface ReportFormProps {
  onGenerate: (report: ReportSnapshot) => void;
  initialReport?: ReportSnapshot | null;
}

const fieldKeyMap: Record<string, keyof AcademicInput> = {
  academic_year: 'academicYear',
  academicYear: 'academicYear',
  semester: 'semester',
  subject_name: 'subjectName',
  subjectName: 'subjectName',
  subject_code: 'subjectCode',
  subjectCode: 'subjectCode',
  faculty_name: 'facultyName',
  facultyName: 'facultyName',
  period: 'period',
};

const emptyFormData: AcademicInput = {
  academicYear: '',
  semester: '' as unknown as number,
  subjectName: '',
  subjectCode: '',
  facultyName: '',
  period: '' as unknown as FeedbackPeriod,
};

export function ReportForm({ onGenerate, initialReport }: ReportFormProps) {
  const [formData, setFormData] = useState<AcademicInput>(() => {
    if (initialReport) {
      return {
        academicYear: initialReport.academic.academicYear,
        semester: initialReport.academic.semester,
        subjectName: initialReport.academic.subjectName,
        subjectCode: initialReport.academic.subjectCode,
        facultyName: initialReport.academic.facultyName,
        period: initialReport.period,
      };
    }
    return { ...emptyFormData };
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof AcademicInput, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialReportRef = useRef<ReportSnapshot | null>(null);

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
      setErrors({});
    }
  }, [initialReport]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, id, value } = e.target;
    const fieldKey = fieldKeyMap[name] || fieldKeyMap[id] || (name as keyof AcademicInput);
    const typedValue = fieldKey === 'semester' ? (value === '' ? '' : parseInt(value, 10)) : value;
    
    setFormData(prev => ({ ...prev, [fieldKey]: typedValue }));
    
    if (errors[fieldKey]) {
      setErrors(prev => ({ ...prev, [fieldKey]: undefined }));
    }
  };

  const handleClear = () => {
    setFormData({ ...emptyFormData });
    setErrors({});
  };

  const handleSubmit = async (e: FormEvent | MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    const result = AcademicInputSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof AcademicInput, string>> = {};
      result.error.errors.forEach(err => {
        const key = err.path[0] as keyof AcademicInput;
        if (key && !fieldErrors[key]) {
          fieldErrors[key] = err.message;
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
    <form onSubmit={handleSubmit} action="javascript:void(0)" className="form-body" noValidate>
      <div className="fields">
        <div className="field">
          <label htmlFor="academic_year">Academic Year / Batch *</label>
          <input
            id="academic_year"
            name="academic_year"
            type="text"
            placeholder="e.g. 2022-23"
            value={formData.academicYear || ''}
            onChange={handleChange}
            required
            aria-invalid={!!errors.academicYear}
            aria-describedby={errors.academicYear ? 'academic_year-error' : undefined}
          />
          <small>Format: YYYY-YY (e.g. 2022-23)</small>
          {errors.academicYear && (
            <span id="academic_year-error" role="alert" className="field-error">
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
            value={formData.semester || ''}
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
            <span id="semester-error" role="alert" className="field-error">
              {errors.semester}
            </span>
          )}
        </div>
        
        <div className="field">
          <label htmlFor="subject_name">Subject Name *</label>
          <input
            id="subject_name"
            name="subject_name"
            type="text"
            placeholder="e.g. Engineering Mathematics - III"
            maxLength={120}
            value={formData.subjectName || ''}
            onChange={handleChange}
            required
            aria-invalid={!!errors.subjectName}
            aria-describedby={errors.subjectName ? 'subject_name-error' : undefined}
          />
          {errors.subjectName && (
            <span id="subject_name-error" role="alert" className="field-error">
              {errors.subjectName}
            </span>
          )}
        </div>
        
        <div className="field">
          <label htmlFor="subject_code">Subject Code *</label>
          <input
            id="subject_code"
            name="subject_code"
            type="text"
            placeholder="e.g. AR2301"
            maxLength={120}
            value={formData.subjectCode || ''}
            onChange={handleChange}
            required
            aria-invalid={!!errors.subjectCode}
            aria-describedby={errors.subjectCode ? 'subject_code-error' : undefined}
          />
          {errors.subjectCode && (
            <span id="subject_code-error" role="alert" className="field-error">
              {errors.subjectCode}
            </span>
          )}
        </div>
        
        <div className="field">
          <label htmlFor="faculty_name">Faculty Name *</label>
          <input
            id="faculty_name"
            name="faculty_name"
            type="text"
            placeholder="e.g. Prof. S. S. Borse"
            maxLength={120}
            value={formData.facultyName || ''}
            onChange={handleChange}
            required
            aria-invalid={!!errors.facultyName}
            aria-describedby={errors.facultyName ? 'faculty_name-error' : undefined}
          />
          {errors.facultyName && (
            <span id="faculty_name-error" role="alert" className="field-error">
              {errors.facultyName}
            </span>
          )}
        </div>
        
        <div className="field field-full">
          <label id="period-label">Feedback Period *</label>
          <div
            className="period-selector"
            role="radiogroup"
            aria-labelledby="period-label"
            aria-describedby={errors.period ? 'period-error' : undefined}
          >
            {(['MID', 'END'] as const).map((p) => (
              <label
                key={p}
                className={`period-option ${formData.period === p ? 'period-option-active' : ''}`}
              >
                <input
                  type="radio"
                  name="period"
                  value={p}
                  checked={formData.period === p}
                  onChange={handleChange}
                  required
                />
                <span className="period-option-content">
                  <span className="period-option-label">{p === 'MID' ? 'Mid Semester' : 'End Semester'}</span>
                  <span className="period-option-desc">
                    {p === 'MID' 
                      ? 'Feedback collected mid-way through the semester' 
                      : 'Feedback collected at the end of the semester'}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {errors.period && (
            <span id="period-error" role="alert" className="field-error">
              {errors.period}
            </span>
          )}
        </div>
      </div>
      
      <div className="form-actions">
        <button
          type="button"
          className="btn secondary"
          onClick={handleClear}
          disabled={isSubmitting}
        >
          Clear fields
        </button>
        <button
          type="submit"
          className="btn primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path d="M5 3h10l4 4v14H5zM15 3v5h5M8 13h8M8 17h6" />
          </svg>
          {isSubmitting ? 'Generating...' : 'Generate Report'}
        </button>
      </div>
    </form>
  );
}
