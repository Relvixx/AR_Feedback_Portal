import { SupabaseStorage } from '../src/lib/storage/supabase';
import { generateFirstReport, generateNextVersion } from '../src/lib/feedback/generator';
import { v4 as uuidv4 } from 'uuid';

const storage = new SupabaseStorage();
const client = storage.getClient();

async function runStorageTest() {
  console.log('=== Starting SupabaseStorage End-to-End Tests ===');

  const testSuffix = uuidv4().substring(0, 8);
  const testAcademic = {
    academicYear: '2023-24',
    semester: 4,
    department: 'Automation and Robotics',
    subjectName: `Test Robotics ${testSuffix}`,
    subjectCode: `TR${testSuffix.toUpperCase()}`,
    facultyName: `Dr. Tester ${testSuffix}`,
  };

  const identity = {
    academicYear: testAcademic.academicYear,
    semester: testAcademic.semester,
    department: testAcademic.department,
    subjectCode: testAcademic.subjectCode,
    facultyName: testAcademic.facultyName,
  };

  try {
    // 1. Generate First Report
    console.log('\n1. Generating first report (MID)...');
    const firstGen = generateFirstReport({ academic: testAcademic, period: 'MID' });
    const groupId = firstGen.groupId;
    const initialSnapshot = firstGen.snapshot;

    // 2. Create Group
    console.log('2. Testing createGroup...');
    const createdGroup = await storage.createGroup({
      id: groupId,
      identity,
      display: testAcademic,
      baselineSeed: firstGen.baselineSeed,
      algorithmVersion: 'gen-v1.0',
      createdAt: new Date().toISOString(),
    });
    console.log('   Group created with ID:', createdGroup.id);

    // 3. Get Group by ID and Identity
    console.log('3. Testing getGroup and getGroupByIdentity...');
    const fetchedById = await storage.getGroup(groupId);
    if (!fetchedById || fetchedById.id !== groupId) {
      throw new Error(`getGroup failed: expected ${groupId}, got ${fetchedById?.id}`);
    }
    const fetchedByIdentity = await storage.getGroupByIdentity(identity);
    if (!fetchedByIdentity || fetchedByIdentity.id !== groupId) {
      throw new Error(`getGroupByIdentity failed: expected ${groupId}, got ${fetchedByIdentity?.id}`);
    }
    console.log('   getGroup and getGroupByIdentity passed!');

    // 4. Save Version 1
    console.log('4. Testing saveVersion (MID v1)...');
    await storage.saveVersion(initialSnapshot);
    const fetchedV1 = await storage.getVersion(initialSnapshot.id);
    if (!fetchedV1 || fetchedV1.id !== initialSnapshot.id) {
      throw new Error('getVersion failed to retrieve saved snapshot');
    }
    console.log('   Version 1 saved and retrieved successfully. Version:', fetchedV1.version);

    // 5. Generate and Save Version 2 (Regeneration)
    console.log('5. Testing regeneration and saveVersion (MID v2)...');
    const v2Snapshot = generateNextVersion(initialSnapshot);
    await storage.saveVersion(v2Snapshot);

    const midVersions = await storage.getVersions(groupId, 'MID');
    if (midVersions.length !== 2) {
      throw new Error(`Expected 2 MID versions, got ${midVersions.length}`);
    }
    const latestMid = await storage.getLatestVersion(groupId, 'MID');
    if (!latestMid || latestMid.version !== 2) {
      throw new Error(`Expected latest version 2, got ${latestMid?.version}`);
    }
    console.log('   Regeneration and multiple versions verified! Latest version:', latestMid.version);

    // 6. Generate and Save END report for same group
    console.log('6. Testing independent END report for same group...');
    const endGen = generateFirstReport({ academic: testAcademic, period: 'END' });
    // Overwrite groupId to attach to same group
    const endSnapshot = { ...endGen.snapshot, groupId: groupId };
    await storage.saveVersion(endSnapshot);

    const endVersions = await storage.getVersions(groupId, 'END');
    if (endVersions.length !== 1 || endVersions[0].version !== 1) {
      throw new Error(`Expected 1 END version with v1, got ${endVersions.length}`);
    }
    console.log('   Independent END report verified for same group!');

    // 7. Test listReports and countReports
    console.log('7. Testing listReports and countReports...');
    const reports = await storage.listReports({
      subjectCode: testAcademic.subjectCode,
    });
    if (reports.length !== 3) {
      throw new Error(`Expected 3 total reports for test subject code, got ${reports.length}`);
    }
    const count = await storage.countReports({
      subjectCode: testAcademic.subjectCode,
    });
    if (count !== 3) {
      throw new Error(`Expected count 3, got ${count}`);
    }
    console.log('   Listing and counting with filters passed! Count:', count);

    // 8. Test Clean Up
    console.log('8. Cleaning up test data...');
    const { error: vErr } = await client.from('report_versions').delete().eq('group_id', groupId);
    if (vErr) console.error('Error cleaning versions:', vErr);
    const { error: gErr } = await client.from('report_groups').delete().eq('id', groupId);
    if (gErr) console.error('Error cleaning group:', gErr);
    console.log('   Clean-up completed.');

    console.log('\n=== All SupabaseStorage Tests PASSED Successfully! ===\n');
  } catch (error) {
    console.error('Test FAILED:', error);
    // Cleanup on failure
    await client.from('report_groups').delete().like('identity_key', `%${testSuffix}%`);
    process.exit(1);
  }
}

runStorageTest();
