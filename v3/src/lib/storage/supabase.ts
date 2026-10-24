/**
 * Supabase PostgreSQL backend implementation of ReportStorage (Phase 4).
 * Uses server-side service-role authentication for isolated, safe persistence.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ReportSnapshot,
  ReportGroup,
  ReportListItem,
  ListReportsParams,
  NormalizedAcademicIdentity,
  FeedbackPeriod,
} from '@/lib/types/report';
import type { ReportStorage } from './index';

function makeIdentityKey(identity: NormalizedAcademicIdentity): string {
  return `${identity.academicYear}|${identity.semester}|${identity.department}|${identity.subjectCode}|${identity.facultyName}`
    .toLowerCase()
    .trim();
}

interface GroupRow {
  id: string;
  identity_key: string;
  identity: NormalizedAcademicIdentity;
  display: any;
  baseline_seed: string;
  algorithm_version: string;
  created_at: string;
}

interface VersionRow {
  id: string;
  group_id: string;
  period: string;
  version: number;
  generated_at: string;
  snapshot: ReportSnapshot;
}

function mapRowToGroup(row: GroupRow): ReportGroup {
  return {
    id: row.id,
    identity: row.identity,
    display: row.display,
    baselineSeed: row.baseline_seed,
    algorithmVersion: row.algorithm_version,
    createdAt: row.created_at,
  };
}

function mapRowToListItem(row: VersionRow): ReportListItem {
  const snapshot = row.snapshot;
  return {
    id: row.id,
    groupId: row.group_id,
    version: row.version,
    period: row.period as FeedbackPeriod,
    academicYear: snapshot?.academic?.academicYear ?? '',
    semester: snapshot?.academic?.semester ?? 1,
    subjectName: snapshot?.academic?.subjectName ?? '',
    subjectCode: snapshot?.academic?.subjectCode ?? '',
    facultyName: snapshot?.academic?.facultyName ?? '',
    respondentCount: snapshot?.respondentCount ?? 0,
    generatedAt: row.generated_at,
  };
}

export class SupabaseStorage implements ReportStorage {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    if (client) {
      this.client = client;
    } else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error('Supabase configuration missing (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required).');
      }

      this.client = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async createGroup(group: ReportGroup): Promise<ReportGroup> {
    const identityKey = makeIdentityKey(group.identity);

    // Check if group with identical identity already exists
    const { data: existing, error: selectErr } = await this.client
      .from('report_groups')
      .select('*')
      .eq('identity_key', identityKey)
      .maybeSingle();

    if (selectErr) {
      console.error('Supabase getGroupByIdentity error:', selectErr);
      throw new Error(`Failed to check existing group: ${selectErr.message}`);
    }

    if (existing) {
      return mapRowToGroup(existing as GroupRow);
    }

    // Insert new group
    const { data: inserted, error: insertErr } = await this.client
      .from('report_groups')
      .insert({
        id: group.id,
        identity_key: identityKey,
        identity: group.identity,
        display: group.display,
        baseline_seed: group.baselineSeed,
        algorithm_version: group.algorithmVersion,
        created_at: group.createdAt || new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      // Handle potential concurrent insert race
      const { data: retryGroup } = await this.client
        .from('report_groups')
        .select('*')
        .eq('identity_key', identityKey)
        .maybeSingle();

      if (retryGroup) {
        return mapRowToGroup(retryGroup as GroupRow);
      }
      console.error('Supabase createGroup error:', insertErr);
      throw new Error(`Failed to insert group: ${insertErr.message}`);
    }

    return mapRowToGroup(inserted as GroupRow);
  }

  async getGroup(groupId: string): Promise<ReportGroup | null> {
    const { data, error } = await this.client
      .from('report_groups')
      .select('*')
      .eq('id', groupId)
      .maybeSingle();

    if (error) {
      console.error('Supabase getGroup error:', error);
      return null;
    }

    return data ? mapRowToGroup(data as GroupRow) : null;
  }

  async getGroupByIdentity(identity: NormalizedAcademicIdentity): Promise<ReportGroup | null> {
    const identityKey = makeIdentityKey(identity);
    const { data, error } = await this.client
      .from('report_groups')
      .select('*')
      .eq('identity_key', identityKey)
      .maybeSingle();

    if (error) {
      console.error('Supabase getGroupByIdentity error:', error);
      return null;
    }

    return data ? mapRowToGroup(data as GroupRow) : null;
  }

  async saveVersion(snapshot: ReportSnapshot): Promise<ReportSnapshot> {
    const { error } = await this.client
      .from('report_versions')
      .upsert({
        id: snapshot.id,
        group_id: snapshot.groupId,
        period: snapshot.period,
        version: snapshot.version,
        generated_at: snapshot.generatedAt,
        snapshot: snapshot,
      });

    if (error) {
      console.error('Supabase saveVersion error:', error);
      throw new Error(`Failed to save report version: ${error.message}`);
    }

    return snapshot;
  }

  async getVersion(reportId: string): Promise<ReportSnapshot | null> {
    const { data, error } = await this.client
      .from('report_versions')
      .select('snapshot')
      .eq('id', reportId)
      .maybeSingle();

    if (error) {
      console.error('Supabase getVersion error:', error);
      return null;
    }

    return data ? (data.snapshot as ReportSnapshot) : null;
  }

  async getVersions(groupId: string, period: FeedbackPeriod): Promise<ReportSnapshot[]> {
    const { data, error } = await this.client
      .from('report_versions')
      .select('snapshot')
      .eq('group_id', groupId)
      .eq('period', period)
      .order('version', { ascending: true });

    if (error) {
      console.error('Supabase getVersions error:', error);
      return [];
    }

    return (data || []).map(row => row.snapshot as ReportSnapshot);
  }

  async getLatestVersion(groupId: string, period: FeedbackPeriod): Promise<ReportSnapshot | null> {
    const { data, error } = await this.client
      .from('report_versions')
      .select('snapshot')
      .eq('group_id', groupId)
      .eq('period', period)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Supabase getLatestVersion error:', error);
      return null;
    }

    return data ? (data.snapshot as ReportSnapshot) : null;
  }

  private applyFilters(query: any, params: ListReportsParams): any {
    let q = query;

    if (params.academicYear) {
      q = q.eq('snapshot->academic->>academicYear', params.academicYear);
    }
    if (params.semester !== undefined) {
      q = q.eq('snapshot->academic->>semester', params.semester.toString());
    }
    if (params.subjectCode) {
      q = q.ilike('snapshot->academic->>subjectCode', `%${params.subjectCode}%`);
    }
    if (params.facultyName) {
      q = q.ilike('snapshot->academic->>facultyName', `%${params.facultyName}%`);
    }
    if (params.period) {
      q = q.eq('period', params.period);
    }

    return q;
  }

  async listReports(params: ListReportsParams): Promise<ReportListItem[]> {
    let query = this.client
      .from('report_versions')
      .select('id, group_id, period, version, generated_at, snapshot')
      .order('generated_at', { ascending: false });

    query = this.applyFilters(query, params);

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 100;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Supabase listReports error:', error);
      throw new Error(`Failed to list reports: ${error.message}`);
    }

    return (data || []).map(row => mapRowToListItem(row as VersionRow));
  }

  async countReports(params: ListReportsParams): Promise<number> {
    let query = this.client
      .from('report_versions')
      .select('id', { count: 'exact', head: true });

    query = this.applyFilters(query, params);

    const { count, error } = await query;

    if (error) {
      console.error('Supabase countReports error:', error);
      throw new Error(`Failed to count reports: ${error.message}`);
    }

    return count ?? 0;
  }
}
