/**
 * Server-side Supabase persistence adapter.
 * Never import this module into a client component.
 * The secret key must be set as SUPABASE_SECRET_KEY (without NEXT_PUBLIC_).
 * RLS is enabled and the anon/authenticated roles have no direct table access.
 */
import type {
  ReportStorage, ReportGroup, ReportSnapshot, ReportListItem,
  ListReportsParams, NormalizedAcademicIdentity, FeedbackPeriod,
} from './index';

type GroupRow = {
  id: string;
  identity_key: string;
  identity: ReportGroup['identity'];
  display: ReportGroup['display'];
  baseline_seed: string;
  algorithm_version: string;
  created_at: string;
};
type VersionRow = { id: string; group_id: string; period: FeedbackPeriod; version: number; generated_at: string; snapshot: ReportSnapshot };

export function identityKey(identity: NormalizedAcademicIdentity): string {
  return [identity.academicYear, identity.semester, identity.department, identity.subjectCode, identity.facultyName]
    .map(value => String(value).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()).join('|');
}

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
    throw new Error('Supabase server configuration missing or invalid');
  }
  return { url: url.replace(/\/$/, ''), key };
}

async function db<T>(table: string, query = '', init: RequestInit = {}): Promise<T> {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${table}${query ? '?' + query : ''}`, {
    ...init,
    cache: 'no-store',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...init.headers,
    },
  });
  if (!response.ok) {
    // Never send secret-containing DB response bodies to browser/logs.
    throw new Error(`Supabase persistence request failed (${response.status})`);
  }
  return response.status === 204 ? ([] as T) : await response.json() as T;
}
const q = (value: string) => encodeURIComponent(value);

function toGroup(row: GroupRow): ReportGroup {
  return {
    id: row.id, identity: row.identity, display: row.display,
    baselineSeed: row.baseline_seed, algorithmVersion: row.algorithm_version, createdAt: row.created_at,
  };
}
function toListItem(s: ReportSnapshot): ReportListItem {
  return {
    id: s.id, groupId: s.groupId, version: s.version, period: s.period,
    academicYear: s.academic.academicYear, semester: s.academic.semester,
    subjectName: s.academic.subjectName, subjectCode: s.academic.subjectCode,
    facultyName: s.academic.facultyName, respondentCount: s.respondentCount,
    generatedAt: s.generatedAt,
  };
}

export class SupabaseStorage implements ReportStorage {
  async createGroup(group: ReportGroup): Promise<ReportGroup> {
    const result = await db<GroupRow[]>('report_groups', 'on_conflict=identity_key', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({
        id: group.id, identity_key: identityKey(group.identity), identity: group.identity,
        display: group.display, baseline_seed: group.baselineSeed,
        algorithm_version: group.algorithmVersion, created_at: group.createdAt,
      }),
    });
    return result.length ? toGroup(result[0]) : (await this.getGroupByIdentity(group.identity))!;
  }
  async getGroup(id: string): Promise<ReportGroup | null> {
    const rows = await db<GroupRow[]>('report_groups', `id=eq.${q(id)}&limit=1`);
    return rows[0] ? toGroup(rows[0]) : null;
  }
  async getGroupByIdentity(identity: NormalizedAcademicIdentity): Promise<ReportGroup | null> {
    const rows = await db<GroupRow[]>('report_groups', `identity_key=eq.${q(identityKey(identity))}&limit=1`);
    return rows[0] ? toGroup(rows[0]) : null;
  }
  async saveVersion(snapshot: ReportSnapshot): Promise<ReportSnapshot> {
    const rows = await db<VersionRow[]>('report_versions', '', {
      method: 'POST',
      body: JSON.stringify({
        id: snapshot.id, group_id: snapshot.groupId, period: snapshot.period,
        version: snapshot.version, generated_at: snapshot.generatedAt, snapshot,
      }),
    });
    return rows[0].snapshot;
  }
  async getVersion(id: string): Promise<ReportSnapshot | null> {
    const rows = await db<VersionRow[]>('report_versions', `id=eq.${q(id)}&limit=1`);
    return rows[0]?.snapshot ?? null;
  }
  async getVersions(groupId: string, period: FeedbackPeriod): Promise<ReportSnapshot[]> {
    const rows = await db<VersionRow[]>('report_versions',
      `group_id=eq.${q(groupId)}&period=eq.${period}&order=version.asc`);
    return rows.map(row => row.snapshot);
  }
  async getLatestVersion(groupId: string, period: FeedbackPeriod): Promise<ReportSnapshot | null> {
    const rows = await db<VersionRow[]>('report_versions',
      `group_id=eq.${q(groupId)}&period=eq.${period}&order=version.desc&limit=1`);
    return rows[0]?.snapshot ?? null;
  }
  private async matching(params: ListReportsParams): Promise<ReportSnapshot[]> {
    const matches: ReportSnapshot[] = [];
    // Fetch in pages; filtering here ensures correctness without JSONB search syntax assumptions.
    for (let offset = 0; ; offset += 500) {
      const rows = await db<VersionRow[]>('report_versions', `select=snapshot&order=generated_at.desc&limit=500&offset=${offset}`);
      for (const row of rows) {
        const s = row.snapshot;
        if (params.academicYear && s.academic.academicYear !== params.academicYear) continue;
        if (params.semester && s.academic.semester !== params.semester) continue;
        if (params.period && s.period !== params.period) continue;
        if (params.subjectCode && !s.academic.subjectCode.toLowerCase().includes(params.subjectCode.toLowerCase())) continue;
        if (params.facultyName && !s.academic.facultyName.toLowerCase().includes(params.facultyName.toLowerCase())) continue;
        matches.push(s);
      }
      if (rows.length < 500) break;
    }
    return matches;
  }
  async listReports(params: ListReportsParams): Promise<ReportListItem[]> {
    const all = await this.matching(params);
    return all.slice(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 100)).map(toListItem);
  }
  async countReports(params: ListReportsParams): Promise<number> {
    return (await this.matching(params)).length;
  }
}
