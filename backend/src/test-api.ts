import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

async function testAPI() {
  console.log('🧪 Testing Appointment Lock System API\n');

  try {
    // 1. Get all users
    console.log('1. Fetching users...');
    const usersResponse = await axios.get(`${API_BASE}/auth/users`);
    console.log('   Users:', usersResponse.data.map((u: any) => `${u.name} (${u.role})`));

    // 2. Login as John Doe
    console.log('\n2. Logging in as John Doe...');
    const loginResponse = await axios.post(`${API_BASE}/auth/dev-login`, {
      email: 'john@example.com'
    });
    const token = loginResponse.data.token;
    console.log('   ✅ Logged in successfully');

    // 3. Get appointments
    console.log('\n3. Fetching appointments...');
    const appointmentsResponse = await axios.get(`${API_BASE}/appointments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Appointments:', appointmentsResponse.data.length);

    // 4. Check lock status for first appointment
    const appointmentId = 'appt-001';
    console.log(`\n4. Checking lock status for ${appointmentId}...`);
    const lockStatusResponse = await axios.get(`${API_BASE}/appointments/${appointmentId}/lock-status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Lock status:', lockStatusResponse.data || 'Not locked');

    // 5. Acquire lock
    console.log(`\n5. Acquiring lock for ${appointmentId}...`);
    const acquireLockResponse = await axios.post(`${API_BASE}/appointments/${appointmentId}/acquire-lock`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   ✅ Lock acquired:', acquireLockResponse.data);

    // 6. Check lock status again
    console.log(`\n6. Checking lock status again...`);
    const lockStatusResponse2 = await axios.get(`${API_BASE}/appointments/${appointmentId}/lock-status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Lock status:', lockStatusResponse2.data);

    // 7. Release lock
    console.log(`\n7. Releasing lock...`);
    await axios.delete(`${API_BASE}/appointments/${appointmentId}/release-lock`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   ✅ Lock released');

    console.log('\n🎉 All tests passed!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAPI();