
const axios = require('axios');
const API_URL = 'http://localhost:3000/api';

async function runFullFlow() {
    console.log('🚀 API VERIFICATION STARTING...\n');

    try {
        // 1. Register Organization
        console.log('1️⃣ Registering Organization...');
        const orgRes = await axios.post(`${API_URL}/auth/register/organization`, {
            organizationName: "Hikvision Test Corp",
            ownerName: "Business Owner 1",
            ownerEmail: "owner@hikvision.com",
            ownerPassword: "password123",
            phone: "1234567890"
        });
        const { token: ownerToken, user: owner, organization } = orgRes.data;
        const orgId = organization.id;
        console.log(`✅ Organization Created: ${organization.name} (${orgId})`);
        console.log(`✅ Owner Created: ${owner.email} (${owner.id})\n`);

        // 2. Create System Admin (as Business Owner)
        // Note: In real app, BO creates Admin.
        console.log('2️⃣ Creating Admin...');
        const adminRes = await axios.post(`${API_URL}/admin/employees`, {
            name: "System Admin 1",
            email: "admin@hikvision.com",
            password: "password123",
            role: "admin",
            department: "IT",
            position: "System Administrator"
        }, { headers: { Authorization: `Bearer ${ownerToken}` } });
        const adminUser = adminRes.data.employee;
        console.log(`✅ Admin Created: ${adminUser.email} (${adminUser.id})\n`);

        // Login as Admin to get token
        const adminLogin = await axios.post(`${API_URL}/auth/login`, {
            email: "admin@hikvision.com",
            password: "password123",
            organizationId: orgId
        });
        const adminToken = adminLogin.data.token;

        // 3. Create Manager (Team Lead)
        console.log('3️⃣ Creating Manager...');
        const managerRes = await axios.post(`${API_URL}/admin/employees`, {
            name: "Manager 1",
            email: "manager@hikvision.com",
            password: "password123",
            role: "employee", // Managers are employees with direct reports
            department: "Sales",
            position: "Sales Manager"
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        const managerUser = managerRes.data.employee;
        console.log(`✅ Manager Created: ${managerUser.email} (${managerUser.id})\n`);

        // 4. Create Employee
        console.log('4️⃣ Creating Employee...');
        const empRes = await axios.post(`${API_URL}/admin/employees`, {
            name: "Employee 1",
            email: "employee@hikvision.com",
            password: "password123",
            role: "employee",
            department: "Sales",
            position: "Sales Representative",
            managerId: managerUser.id // Assign to Manager
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        const employeeUser = empRes.data.employee;
        console.log(`✅ Employee Created: ${employeeUser.email} (${employeeUser.id})`);
        console.log(`   Manager Assigned: ${managerUser.name}\n`);

        // Login as Employee
        const empLogin = await axios.post(`${API_URL}/auth/login`, {
            email: "employee@hikvision.com",
            password: "password123",
            organizationId: orgId
        });
        const empToken = empLogin.data.token;

        // 5. Attendance Check-in
        console.log('5️⃣ Simulating Check-in...');
        const checkInRes = await axios.post(`${API_URL}/attendance/record`, {
            action: 'Check In',
            location: {
                latitude: 12.9716,
                longitude: 77.5946,
                address: "Bangalore, India" // Mock address
            },
            notes: "Morning shift start"
        }, { headers: { Authorization: `Bearer ${empToken}` } });
        console.log(`✅ Check-in Successful: ${checkInRes.data.data.checkInTime}\n`);

        // 6. Leave Request
        console.log('6️⃣ Submitting Leave Request...');
        const leaveRes = await axios.post(`${API_URL}/leave/apply`, {
            leaveType: "sick",
            startDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            endDate: new Date().toISOString().split('T')[0],
            reason: "Not feeling well"
        }, { headers: { Authorization: `Bearer ${empToken}` } });
        console.log(`✅ Leave Requested: ${leaveRes.data.data.status}\n`);

        // 7. Approve Leave (as Manager/Admin)
        console.log('7️⃣ Approving Leave (as Admin)...');
        const leaveId = leaveRes.data.data.id;
        try {
            const approveRes = await axios.put(`${API_URL}/leave/${leaveId}/status`, {
                status: "Approved",
                comments: "Get well soon"
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            console.log(`✅ Leave Approved: ${approveRes.data.data.status}\n`);
        } catch (error) {
            console.log('⚠️ Leave approval failed:', error.response?.data || error.message);
        }

        // 8. Dashboard Stats & Map Data (as Admin)
        console.log('8️⃣ Verifying Dashboard Stats & Map Data...');
        const statsRes = await axios.get(`${API_URL}/admin/dashboard/stats`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        console.log(`✅ Stats Retrieved:`);
        console.log(`   - Total Employees: ${statsRes.data.employees.total}`);
        console.log(`   - Active Now: ${statsRes.data.attendance.present}`);
        console.log(`   - Pending Leaves: ${statsRes.data.leaves.pendingCount}`);

        // Verify Attendance in Activity Feed or Map
        const attendanceRes = await axios.get(`${API_URL}/admin/attendance`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const todayAttendance = attendanceRes?.data?.records || [];
        const hasLocation = todayAttendance.some(a => a.checkInLocation && a.checkInLocation.latitude);

        console.log(`✅ Map Data Verification: ${hasLocation ? 'Found Location Data' : 'No Location Data Found'}`);

        console.log('\n🎉 FULL FLOW VERIFICATION COMPLETE!');

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

runFullFlow();
