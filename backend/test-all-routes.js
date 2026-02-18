/**
 * test-all-routes.js — v2 (writes results to file)
 */

const fs = require('fs');
const path = require('path');
const API_URL = 'http://localhost:3000/api';

async function apiCall(method, urlPath, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API_URL}${urlPath}`, opts);
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }
        return { status: res.status, data, ok: res.ok };
    } catch (err) {
        return { status: 0, data: null, ok: false, error: err.message };
    }
}

const results = [];
const lines = [];
function log(msg) { lines.push(msg); }
function record(group, endpoint, status, ok, detail = '') {
    const icon = ok ? 'PASS' : 'FAIL';
    results.push({ group, endpoint, status, ok, detail });
    log(`  [${icon}] [${status}] ${endpoint}${detail ? ' -- ' + detail : ''}`);
}

async function runTests() {
    log('COMPREHENSIVE API ROUTE TESTING');
    log('='.repeat(60));

    // 1. HEALTH
    log('\n1. HEALTH CHECK');
    let r = await apiCall('GET', '/health');
    record('Health', 'GET /api/health', r.status, r.ok, r.data?.status);

    // 2. AUTH
    log('\n2. AUTH ROUTES');

    r = await apiCall('POST', '/auth/login', {});
    record('Auth', 'POST /auth/login (empty)', r.status, r.status === 400, r.data?.error);

    r = await apiCall('POST', '/auth/login', { email: 'charlie@democompany.com', password: 'wrongpassword' });
    record('Auth', 'POST /auth/login (wrong pwd)', r.status, r.status === 401, r.data?.error);

    r = await apiCall('POST', '/auth/login', { email: 'nobody@nowhere.com', password: 'test' });
    record('Auth', 'POST /auth/login (no user)', r.status, r.status === 401, r.data?.error);

    // Login system admin
    r = await apiCall('POST', '/auth/login', { email: 'logithkumar188@gmail.com', password: 'logith18801880.' });
    const sysAdminToken = r.ok ? r.data?.token : null;
    record('Auth', 'POST /auth/login (system_admin)', r.status, r.ok, 'role=' + r.data?.user?.role);

    // Login admin
    r = await apiCall('POST', '/auth/login', { email: 'admin@democompany.com', password: 'password123' });
    const adminToken = r.ok ? r.data?.token : null;
    record('Auth', 'POST /auth/login (admin)', r.status, r.ok, 'role=' + r.data?.user?.role + ', org=' + r.data?.user?.organizationId);

    // Login business owner
    r = await apiCall('POST', '/auth/login', { email: 'owner@democompany.com', password: 'password123' });
    const boToken = r.ok ? r.data?.token : null;
    record('Auth', 'POST /auth/login (business_owner)', r.status, r.ok, 'role=' + r.data?.user?.role);

    // Login employee
    r = await apiCall('POST', '/auth/login', { email: 'charlie@democompany.com', password: 'password123' });
    const empToken = r.ok ? r.data?.token : null;
    record('Auth', 'POST /auth/login (employee)', r.status, r.ok, 'role=' + r.data?.user?.role);

    // GET /auth/profile
    r = await apiCall('GET', '/auth/profile', null, empToken);
    record('Auth', 'GET /auth/profile (employee)', r.status, r.ok, r.data?.user?.name || r.data?.error);

    // GET /auth/me
    r = await apiCall('GET', '/auth/me', null, empToken);
    record('Auth', 'GET /auth/me (employee)', r.status, r.ok, r.data?.user?.name || r.data?.error);

    r = await apiCall('GET', '/auth/me', null, sysAdminToken);
    record('Auth', 'GET /auth/me (system_admin)', r.status, r.ok, r.data?.user?.name || r.data?.error);

    r = await apiCall('GET', '/auth/profile');
    record('Auth', 'GET /auth/profile (no token)', r.status, r.status === 401, r.data?.error);

    // 3. ADMIN ROUTES
    log('\n3. ADMIN ROUTES');

    r = await apiCall('GET', '/admin/dashboard/stats', null, adminToken);
    record('Admin', 'GET /admin/dashboard/stats (admin)', r.status, r.ok, 'total=' + r.data?.employees?.total);

    r = await apiCall('GET', '/admin/dashboard/stats', null, boToken);
    record('Admin', 'GET /admin/dashboard/stats (BO)', r.status, r.ok);

    r = await apiCall('GET', '/admin/dashboard/stats');
    record('Admin', 'GET /admin/dashboard/stats (no auth)', r.status, r.status === 401);

    r = await apiCall('GET', '/admin/dashboard/stats', null, empToken);
    record('Admin', 'GET /admin/dashboard/stats (employee)', r.status, r.status === 403, r.data?.error);

    r = await apiCall('GET', '/admin/employees', null, adminToken);
    record('Admin', 'GET /admin/employees', r.status, r.ok, 'count=' + r.data?.count);

    r = await apiCall('GET', '/admin/employees/active', null, adminToken);
    record('Admin', 'GET /admin/employees/active', r.status, r.ok, 'count=' + r.data?.count);

    r = await apiCall('GET', '/admin/employees/user_emp_001', null, adminToken);
    record('Admin', 'GET /admin/employees/:id', r.status, r.ok, r.data?.employee?.name);

    r = await apiCall('GET', '/admin/employees/nonexistent', null, adminToken);
    record('Admin', 'GET /admin/employees/:id (404)', r.status, r.status === 404, r.data?.error);

    r = await apiCall('GET', '/admin/employees/search/charlie', null, adminToken);
    record('Admin', 'GET /admin/employees/search/:term', r.status, r.ok, 'count=' + r.data?.count);

    r = await apiCall('GET', '/admin/employees/department/IT', null, adminToken);
    record('Admin', 'GET /admin/employees/department/:dept', r.status, r.ok, 'count=' + r.data?.count);

    r = await apiCall('GET', '/admin/employees/created-by-me', null, adminToken);
    record('Admin', 'GET /admin/employees/created-by-me', r.status, r.ok, 'count=' + r.data?.count);

    r = await apiCall('POST', '/admin/employees', {
        name: 'Test Employee API', email: 'testapi' + Date.now() + '@test.com',
        password: 'password123', role: 'employee', department: 'Testing', position: 'QA'
    }, adminToken);
    const testEmpId = r.data?.employee?.id;
    record('Admin', 'POST /admin/employees (create)', r.status, r.status === 201, r.data?.employee?.name || r.data?.error);

    if (testEmpId) {
        r = await apiCall('PUT', `/admin/employees/${testEmpId}`, { position: 'Senior QA' }, adminToken);
        record('Admin', 'PUT /admin/employees/:id (update)', r.status, r.ok, r.data?.employee?.position);
    }

    if (testEmpId) {
        r = await apiCall('DELETE', `/admin/employees/${testEmpId}`, null, adminToken);
        record('Admin', 'DELETE /admin/employees/:id', r.status, r.ok, r.data?.message);
    }

    if (testEmpId) {
        r = await apiCall('POST', `/admin/employees/${testEmpId}/restore`, null, adminToken);
        record('Admin', 'POST /admin/employees/:id/restore', r.status, r.ok, r.data?.message || r.data?.error);
    }

    r = await apiCall('GET', '/admin/attendance', null, adminToken);
    record('Admin', 'GET /admin/attendance', r.status, r.ok, 'count=' + r.data?.count);

    r = await apiCall('GET', '/admin/attendance/summary', null, adminToken);
    record('Admin', 'GET /admin/attendance/summary', r.status, r.ok);

    r = await apiCall('GET', '/admin/leaves', null, adminToken);
    record('Admin', 'GET /admin/leaves', r.status, r.ok, 'count=' + r.data?.count);

    r = await apiCall('GET', '/admin/leaves/pending', null, adminToken);
    record('Admin', 'GET /admin/leaves/pending', r.status, r.ok, 'count=' + r.data?.count);

    r = await apiCall('GET', '/admin/leaves/stats/summary', null, adminToken);
    record('Admin', 'GET /admin/leaves/stats/summary', r.status, r.ok);

    r = await apiCall('GET', '/admin/quota', null, adminToken);
    record('Admin', 'GET /admin/quota', r.status, r.ok);

    r = await apiCall('GET', '/admin/quota/check', null, adminToken);
    record('Admin', 'GET /admin/quota/check', r.status, r.ok);

    r = await apiCall('GET', '/admin/admins/quota-status', null, boToken);
    record('Admin', 'GET /admin/admins/quota-status (BO)', r.status, r.ok, 'count=' + r.data?.count);

    r = await apiCall('GET', '/admin/organization', null, adminToken);
    record('Admin', 'GET /admin/organization', r.status, r.ok, r.data?.name);

    // 4. ATTENDANCE ROUTES
    log('\n4. ATTENDANCE ROUTES (Employee)');

    r = await apiCall('GET', '/attendance/today', null, empToken);
    record('Attendance', 'GET /attendance/today', r.status, r.ok);

    r = await apiCall('POST', '/attendance/record', {
        action: 'Check In', location: { latitude: 12.97, longitude: 77.59, address: 'Test' }
    }, empToken);
    record('Attendance', 'POST /attendance/record (Check In)', r.status, r.ok, r.data?.data?.checkInTime || r.data?.error);

    r = await apiCall('GET', '/attendance/my-records', null, empToken);
    record('Attendance', 'GET /attendance/my-records', r.status, r.ok);

    const today = new Date();
    const ws = new Date(today); ws.setDate(today.getDate() - today.getDay());
    const we = new Date(ws); we.setDate(ws.getDate() + 6);
    r = await apiCall('GET', `/attendance/weekly-hours?weekStart=${ws.toISOString().split('T')[0]}&weekEnd=${we.toISOString().split('T')[0]}`, null, empToken);
    record('Attendance', 'GET /attendance/weekly-hours', r.status, r.ok);

    r = await apiCall('POST', '/attendance/record', {
        action: 'Check Out', location: { latitude: 12.97, longitude: 77.59, address: 'Test' }
    }, empToken);
    record('Attendance', 'POST /attendance/record (Check Out)', r.status, r.ok, r.data?.data?.checkOutTime || r.data?.error);

    // 5. LEAVE ROUTES
    log('\n5. LEAVE ROUTES');

    r = await apiCall('GET', '/leave/balance', null, empToken);
    record('Leave', 'GET /leave/balance', r.status, r.ok);

    r = await apiCall('GET', '/leave/my-leaves', null, empToken);
    record('Leave', 'GET /leave/my-leaves', r.status, r.ok);

    const randomOffset = 70 + Math.floor(Math.random() * 20); // 70-89 days ahead
    const fd = new Date(today); fd.setDate(today.getDate() + randomOffset);
    const fd2 = new Date(fd); fd2.setDate(fd.getDate() + 1);
    r = await apiCall('POST', '/leave/apply', {
        leaveType: 'casual', startDate: fd.toISOString().split('T')[0],
        endDate: fd2.toISOString().split('T')[0], reason: 'API Test leave ' + Date.now()
    }, empToken);
    const testLeaveId = r.data?.data?.id;
    record('Leave', 'POST /leave/apply', r.status, r.ok || r.status === 201, r.data?.data?.status || r.data?.error);

    if (testLeaveId) {
        r = await apiCall('GET', `/leave/${testLeaveId}`, null, empToken);
        record('Leave', 'GET /leave/:leaveId', r.status, r.ok, r.data?.data?.status);
    }

    if (testLeaveId) {
        r = await apiCall('PUT', `/leave/${testLeaveId}`, { reason: 'Updated reason' }, empToken);
        record('Leave', 'PUT /leave/:leaveId', r.status, r.ok, r.data?.message || r.data?.error);
    }

    r = await apiCall('GET', '/leave/upcoming', null, empToken);
    record('Leave', 'GET /leave/upcoming', r.status, r.ok);

    r = await apiCall('GET', '/leave/stats/my-stats', null, empToken);
    record('Leave', 'GET /leave/stats/my-stats', r.status, r.ok);

    r = await apiCall('GET', '/leave/all', null, adminToken);
    record('Leave', 'GET /leave/all (admin)', r.status, r.ok, 'count=' + r.data?.count);

    if (testLeaveId) {
        r = await apiCall('PUT', `/leave/${testLeaveId}/status`, { status: 'Approved', comments: 'Test' }, adminToken);
        record('Leave', 'PUT /leave/:id/status (approve)', r.status, r.ok, r.data?.message || r.data?.error);
    }

    // 6. SYSTEM ADMIN ROUTES
    log('\n6. SYSTEM ADMIN ROUTES');

    r = await apiCall('GET', '/system-admin/organizations', null, sysAdminToken);
    record('SysAdmin', 'GET /system-admin/organizations', r.status, r.ok, 'count=' + r.data?.count);

    r = await apiCall('GET', '/system-admin/organizations/active', null, sysAdminToken);
    record('SysAdmin', 'GET /system-admin/organizations/active', r.status, r.ok);

    r = await apiCall('GET', '/system-admin/organizations/inactive', null, sysAdminToken);
    record('SysAdmin', 'GET /system-admin/organizations/inactive', r.status, r.ok);

    r = await apiCall('GET', '/system-admin/organizations/org_demo_001', null, sysAdminToken);
    record('SysAdmin', 'GET /system-admin/organizations/:id', r.status, r.ok, r.data?.organization?.name);

    r = await apiCall('GET', '/system-admin/organizations/org_demo_001/quota', null, sysAdminToken);
    record('SysAdmin', 'GET /system-admin/organizations/:id/quota', r.status, r.ok);

    r = await apiCall('GET', '/system-admin/dashboard/stats', null, sysAdminToken);
    record('SysAdmin', 'GET /system-admin/dashboard/stats', r.status, r.ok);

    r = await apiCall('GET', '/system-admin/organizations', null, adminToken);
    record('SysAdmin', 'GET /system-admin/orgs (wrong role)', r.status, r.status === 403, r.data?.error);

    // 7. HIKVISION
    log('\n7. HIKVISION EVENT ROUTES');
    r = await apiCall('GET', '/event');
    record('Hikvision', 'GET /event', r.status, r.ok);

    r = await apiCall('POST', '/event', {});
    record('Hikvision', 'POST /event (empty)', r.status, r.ok);

    // 8. 404
    log('\n8. ERROR HANDLING');
    r = await apiCall('GET', '/nonexistent/route');
    record('Error', 'GET /nonexistent/route', r.status, r.status === 404);

    // SUMMARY
    log('\n' + '='.repeat(60));
    log('TEST SUMMARY');
    log('='.repeat(60));
    const passed = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);
    log(`Total: ${results.length}  |  PASS: ${passed.length}  |  FAIL: ${failed.length}`);

    if (failed.length > 0) {
        log('\nFAILED TESTS:');
        for (const f of failed) {
            log(`  [${f.group}] ${f.endpoint} -> ${f.status} ${f.detail}`);
        }
    }

    log('\nBY CATEGORY:');
    const groups = {};
    for (const r of results) {
        if (!groups[r.group]) groups[r.group] = { pass: 0, fail: 0 };
        r.ok ? groups[r.group].pass++ : groups[r.group].fail++;
    }
    for (const [g, c] of Object.entries(groups)) {
        log(`  ${c.fail === 0 ? 'OK' : 'ISSUES'}  ${g}: ${c.pass} pass, ${c.fail} fail`);
    }

    fs.writeFileSync(path.join(__dirname, 'test-results.txt'), lines.join('\n'), 'utf8');
    console.log('Results written to test-results.txt');
}

runTests().catch(err => { console.error('Crashed:', err); process.exit(1); });
