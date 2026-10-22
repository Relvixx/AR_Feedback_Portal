import { generateFirstReport } from '../src/lib/feedback/generator';
import { generatePDF } from '../src/lib/pdf/generator';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function testPDF() {
  console.log('Testing PDF generation...');
  
  const academic = {
    academicYear: '2022-23',
    semester: 3,
    department: 'Automation and Robotics',
    subjectName: 'Engineering Mathematics-III',
    subjectCode: 'AR2301',
    facultyName: 'Prof. S. S. Borse',
  };

  const result = generateFirstReport({ academic, period: 'MID' });
  const snapshot = result.snapshot;
  
  console.log('Report generated:', snapshot.id);
  console.log('Respondent count:', snapshot.respondentCount);
  console.log('Period:', snapshot.period);
  console.log('Questions:', snapshot.questions.length);
  
  try {
    const pdfBuffer = await generatePDF(snapshot);
    const outputPath = join(process.cwd(), 'test-output.pdf');
    writeFileSync(outputPath, pdfBuffer);
    console.log('PDF generated successfully:', outputPath);
    console.log('PDF size:', pdfBuffer.length, 'bytes');
  } catch (error) {
    console.error('PDF generation failed:', error);
    process.exit(1);
  }
}

testPDF();