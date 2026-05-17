const fetch = require('node-fetch');

async function run() {
  const r = await fetch('http://127.0.0.1:4000/api/students');
  const students = await r.json();
  const student = students[0];

  const res = await fetch('http://127.0.0.1:4000/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: student.id,
      studentName: 'Test Student',
      amount: 100,
      type: 'tuition',
      method: 'wallet',
      date: '2026-05-14',
      receiptNumber: 'REC-12345678',
      collectedBy: 'Test',
      notes: 'Test',
      walletPhoneNumber: '01012345678'
    })
  });
  console.log("Status:", res.status);
  console.log("Response:", await res.text());
}
run();
