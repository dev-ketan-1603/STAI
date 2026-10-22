import http from 'http';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🧪 Starting STAI Comprehensive Backend Verification...\n');
  let token = '';

  // Check if server is running
  let health;
  try {
    health = await request('/health');
  } catch (err) {
    console.error('❌ Cannot connect to backend server at ' + BASE_URL);
    console.error('👉 Please start the server first in another terminal: npm start (or npm run dev)\n');
    process.exit(1);
  }
  console.log('1. Health check:', health.status === 200 && health.data.status === 'ok' ? '✅ PASS' : '❌ FAIL', health.data);

  // 2. Auth register/login
  const testEmail = `test_${Date.now()}@stai.dev`;
  const reg = await request('/auth/register', {
    method: 'POST',
    body: { name: 'Test Student', email: testEmail, password: 'password123' },
  });
  console.log('2. Auth register:', reg.status === 201 && reg.data.token ? '✅ PASS' : '❌ FAIL');
  token = reg.data?.token;

  // 3. Auth me
  const me = await request('/auth/me', { token });
  console.log('3. Auth /me verify:', me.status === 200 && me.data.user.email === testEmail ? '✅ PASS' : '❌ FAIL');

  // 4. Profile / Education
  const edu = await request('/profile/edu', {
    method: 'POST',
    token,
    body: {
      institution: 'Tech University',
      educationLevel: 'Undergraduate',
      course: 'Computer Science',
      semester: '4th',
      specialization: 'Artificial Intelligence',
      subjects: ['Data Structures', 'Machine Learning', 'Mathematics'],
    },
  });
  console.log('4. Profile /edu save:', edu.status === 200 && edu.data.success ? '✅ PASS' : '❌ FAIL');

  // 5. AI Predict (Python ML Model or JS Fallback)
  const predict = await request('/ai-predict', {
    method: 'POST',
    token,
    body: {
      study_hours: 4,
      focus_level: 7,
      breaks: 1,
      difficulty_level: 2.5,
      previous_score: 75,
      subjects: [
        { name: 'Data Structures', correct_questions: 8, total_questions: 10 },
        { name: 'Machine Learning', correct_questions: 7, total_questions: 10 },
      ],
    },
  });
  console.log('5. AI Predict:',
    predict.status === 200 && predict.data.recommended_hours && predict.data.explanation && predict.data.difficulty_analysis && predict.data.study_path
      ? '✅ PASS (RF + XAI + Bayes + A*)'
      : '❌ FAIL', {
    recommended_hours: predict.data?.recommended_hours,
    predicted_performance: predict.data?.predicted_performance,
    top_factor_xai: predict.data?.explanation?.top_factor,
    bayes_classes: Object.keys(predict.data?.difficulty_analysis || {}),
    astar_path: predict.data?.study_path?.path,
  });

  // 6. AI Questions
  const questions = await request('/ai/questions', {
    method: 'POST',
    token,
    body: { subject: 'Data Structures', context: 'Binary Trees', count: 3 },
  });
  console.log('6. AI Questions generation:', questions.status === 200 && questions.data.questions?.length > 0 ? '✅ PASS' : '❌ FAIL', `(Count: ${questions.data?.questions?.length})`);

  // 7. AI Summarize
  const summary = await request('/ai/summarize', {
    method: 'POST',
    token,
    body: { subject: 'Data Structures', text: 'A binary search tree has left child smaller than root and right child greater.' },
  });
  console.log('7. AI Summarize:', summary.status === 200 && summary.data.summary?.length > 0 ? '✅ PASS' : '❌ FAIL');

  // 8. AI Ask
  const ask = await request('/ai/ask', {
    method: 'POST',
    token,
    body: { subject: 'Data Structures', question: 'What is the time complexity of searching in a BST?' },
  });
  console.log('8. AI Ask Q&A:', ask.status === 200 && ask.data.answer?.length > 0 ? '✅ PASS' : '❌ FAIL');

  // 9. AI Schedule
  const sched = await request('/ai/schedule', {
    method: 'POST',
    token,
    body: { subjects: ['Data Structures', 'Machine Learning'], hoursPerDay: 3 },
  });
  console.log('9. AI Schedule planner:', sched.status === 200 && sched.data.schedule?.length > 0 ? '✅ PASS' : '❌ FAIL');

  // 10. AI Materials
  const materials = await request('/ai/materials', {
    method: 'POST',
    token,
    body: { subject: 'Machine Learning', level: 'Undergraduate' },
  });
  console.log('10. AI Materials recommendation:', materials.status === 200 && materials.data.materials?.length > 0 ? '✅ PASS' : '❌ FAIL');

  // 11. AI Growth
  const growth = await request('/ai/growth', {
    method: 'POST',
    token,
    body: { subject: 'Machine Learning', scores: [{ label: 'Quiz 1', score: 85 }] },
  });
  console.log('11. AI Growth analysis:', growth.status === 200 && growth.data.overallScore !== undefined ? '✅ PASS' : '❌ FAIL');

  // 12. Contact Form
  const contact = await request('/contact', {
    method: 'POST',
    body: { name: 'Student Tester', email: 'student@example.com', message: 'Hello STAI support!' },
  });
  console.log('12. Contact Form:', contact.status === 200 && contact.data.success ? '✅ PASS' : '❌ FAIL');

  // 13. Quiz Save & History
  const quizSave = await request('/quiz/save', {
    method: 'POST',
    token,
    body: { subject: 'Data Structures', correct: 4, total: 5, timeTakenSeconds: 120 },
  });
  console.log('13. Quiz save attempt:', quizSave.status === 200 && quizSave.data.success ? '✅ PASS' : '❌ FAIL');

  console.log('\n✨ All backend verification checks completed!\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
