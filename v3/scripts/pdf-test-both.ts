import { generateFirstReport } from '../src/lib/feedback/generator';
import { generatePDF } from '../src/lib/pdf/generator';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function testBothPeriods() {
  console.log('Testing PDF generation for both periods...');
  
  const academic = {
    academicYear: '2022-23',
    semester: 3,
    department: 'Automation and Robotics',
    subjectName: 'Engineering Mathematics-III',
    subjectCode: 'AR2301',
    facultyName: 'Prof. S. S. Borse',
  };

  // Test MID
  const midResult = generateFirstReport({ academic, period: 'MID' });
  const midSnapshot = midResult.snapshot;
  
  console.log('MID Report generated:', midSnapshot.id);
  console.log('MID Respondent count:', midSnapshot.respondentCount);
  
  const midPdfBuffer = await generatePDF(midSnapshot);
  const midOutputPath = join(process.cwd(), 'test-output-mid.pdf');
  writeFileSync(midOutputPath, midPdfBuffer);
  console.log('MID PDF generated:', midOutputPath, '(', midPdfBuffer.length, 'bytes)');
  
  // Test END
  const endResult = generateFirstReport({ academic, period: 'END' });
  const endSnapshot = endResult.snapshot;
  
  console.log('END Report generated:', endSnapshot.id);
  console.log('END Respondent count:', endSnapshot.respondentCount);
  
  const endPdfBuffer = await generatePDF(endSnapshot);
  const endOutputPath = join(process.cwd(), 'test-output-end.pdf');
  writeFileSync(endOutputPath, endPdfBuffer);
  console.log('END PDF generated:', endOutputPath, '(', endPdfBuffer.length, 'bytes)');
  
  console.log('All tests passed!');
}

testBothPeriods();