/**
 * Storage contract for report persistence.
 * Phase 1 uses in-memory implementation; Phase 4 will implement Supabase backend.
 */

import {
  ReportSnapshot,
  ReportGroup,
  ReportListItem,
  ListReportsParams,
  NormalizedAcademicIdentity,
  FeedbackPeriod,
} from '@/lib/types/report';

export interface ReportStorage {
  // Group operations
  createGroup(group: ReportGroup): Promise<ReportGroup>;
  getGroup(groupId: string): Promise<ReportGroup | null>;
  getGroupByIdentity(identity: NormalizedAcademicIdentity): Promise<ReportGroup | null>;
  
  // Version operations
  saveVersion(snapshot: ReportSnapshot): Promise<ReportSnapshot>;
  getVersion(reportId: string): Promise<ReportSnapshot | null>;
  getVersions(groupId: string, period: FeedbackPeriod): Promise<ReportSnapshot[]>;
  getLatestVersion(groupId: string, period: FeedbackPeriod): Promise<ReportSnapshot | null>;
  
  // Listing and search
  listReports(params: ListReportsParams): Promise<ReportListItem[]>;
  countReports(params: ListReportsParams): Promise<number>;
}

class InMemoryStorage implements ReportStorage {
  private groups = new Map<string, ReportGroup>();
  private versions = new Map<string, ReportSnapshot>();
  private groupVersions = new Map<string, Map<FeedbackPeriod, ReportSnapshot[]>>();
  private identityToGroupId = new Map<string, string>();

  private getGroupVersionsMap(groupId: string): Map<FeedbackPeriod, ReportSnapshot[]> {
    if (!this.groupVersions.has(groupId)) {
      this.groupVersions.set(groupId, new Map());
    }
    return this.groupVersions.get(groupId)!;
  }

  private getPeriodVersions(groupId: string, period: FeedbackPeriod): ReportSnapshot[] {
    const map = this.getGroupVersionsMap(groupId);
    if (!map.has(period)) {
      map.set(period, []);
    }
    return map.get(period)!;
  }

  async createGroup(group: ReportGroup): Promise<ReportGroup> {
    const key = `${group.identity.academicYear}|${group.identity.semester}|${group.identity.department}|${group.identity.subjectCode}|${group.identity.facultyName}`.toLowerCase();
    
    if (this.identityToGroupId.has(key)) {
      const existingId = this.identityToGroupId.get(key)!;
      return this.groups.get(existingId)!;
    }
    
    this.groups.set(group.id, group);
    this.identityToGroupId.set(key, group.id);
    this.getGroupVersionsMap(group.id); // Initialize
    return group;
  }

  async getGroup(groupId: string): Promise<ReportGroup | null> {
    return this.groups.get(groupId) ?? null;
  }

  async getGroupByIdentity(identity: NormalizedAcademicIdentity): Promise<ReportGroup | null> {
    const key = `${identity.academicYear}|${identity.semester}|${identity.department}|${identity.subjectCode}|${identity.facultyName}`.toLowerCase();
    const groupId = this.identityToGroupId.get(key);
    if (!groupId) return null;
    return this.groups.get(groupId) ?? null;
  }

  async saveVersion(snapshot: ReportSnapshot): Promise<ReportSnapshot> {
    this.versions.set(snapshot.id, snapshot);
    
    const periodVersions = this.getPeriodVersions(snapshot.groupId, snapshot.period);
    periodVersions.push(snapshot);
    periodVersions.sort((a, b) => a.version - b.version);
    
    return snapshot;
  }

  async getVersion(reportId: string): Promise<ReportSnapshot | null> {
    return this.versions.get(reportId) ?? null;
  }

  async getVersions(groupId: string, period: FeedbackPeriod): Promise<ReportSnapshot[]> {
    return [...this.getPeriodVersions(groupId, period)];
  }

  async getLatestVersion(groupId: string, period: FeedbackPeriod): Promise<ReportSnapshot | null> {
    const versions = this.getPeriodVersions(groupId, period);
    if (versions.length === 0) return null;
    return versions[versions.length - 1];
  }

  async listReports(params: ListReportsParams): Promise<ReportListItem[]> {
    let results = Array.from(this.versions.values());
    
    if (params.academicYear) {
      results = results.filter(r => r.academic.academicYear === params.academicYear);
    }
    if (params.semester) {
      results = results.filter(r => r.academic.semester === params.semester);
    }
    if (params.subjectCode) {
      results = results.filter(r => r.academic.subjectCode.toLowerCase().includes(params.subjectCode!.toLowerCase()));
    }
    if (params.facultyName) {
      results = results.filter(r => r.academic.facultyName.toLowerCase().includes(params.facultyName!.toLowerCase()));
    }
    if (params.period) {
      results = results.filter(r => r.period === params.period);
    }
    
    results.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 100;
    results = results.slice(offset, offset + limit);
    
    return results.map(r => ({
      id: r.id,
      groupId: r.groupId,
      version: r.version,
      period: r.period,
      academicYear: r.academic.academicYear,
      semester: r.academic.semester,
      subjectName: r.academic.subjectName,
      subjectCode: r.academic.subjectCode,
      facultyName: r.academic.facultyName,
      respondentCount: r.respondentCount,
      generatedAt: r.generatedAt,
    }));
  }

  async countReports(params: ListReportsParams): Promise<number> {
    let count = 0;
    for (const r of this.versions.values()) {
      if (params.academicYear && r.academic.academicYear !== params.academicYear) continue;
      if (params.semester && r.academic.semester !== params.semester) continue;
      if (params.subjectCode && !r.academic.subjectCode.toLowerCase().includes(params.subjectCode.toLowerCase())) continue;
      if (params.facultyName && !r.academic.facultyName.toLowerCase().includes(params.facultyName.toLowerCase())) continue;
      if (params.period && r.period !== params.period) continue;
      count++;
    }
    return count;
  }

  // Test helper - clear all data
  clear(): void {
    this.groups.clear();
    this.versions.clear();
    this.groupVersions.clear();
    this.identityToGroupId.clear();
  }
}

// Local tests continue using the in-memory adapter; hosted server requests use Supabase.\nimport { SupabaseStorage } from './supabase';\nexport const storage: ReportStorage = process.env.NODE_ENV === 'production'\n  ? new SupabaseStorage() : new InMemoryStorage();

// Export type for dependency injection in tests
export type { InMemoryStorage };