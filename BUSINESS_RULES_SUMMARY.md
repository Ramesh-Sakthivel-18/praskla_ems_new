# 📋 Business Rules Summary - Quick Reference

## 🔐 Authentication Rules

| Rule | Description |
|------|-------------|
| **Login** | Email + password (plain text - **security issue**) |
| **Token** | Firebase custom token → ID token exchange |
| **Admin Access** | `role === 'admin'` required for admin endpoints |
| **Employee Access** | `role === 'employee'` for employee endpoints |
| **Token Format** | `Authorization: Bearer <token>` header required |

---

## 👥 Employee Management Rules

| Rule | Description |
|------|-------------|
| **Required Fields** | `name`, `email`, `password`, `role`, `department`, `workingType` |
| **Email Uniqueness** | Email must be unique (case-insensitive) |
| **Default Role** | `'employee'` if not specified |
| **Default Position** | Uses `role` value if not provided |
| **Default Salary** | `'0'` if not provided |
| **Default Status** | `isActive: true` |
| **Deletion** | Soft delete (sets `isActive: false`) |
| **Email Storage** | Always stored in lowercase |

---

## ⏰ Attendance Rules

### **Valid Actions**
- `checkIn` - Start of work day
- `checkOut` - End of work day
- `breakIn` - Start of break
- `breakOut` - End of break

### **Document ID Format**
```
{employeeId}_{date}
Example: "emp123_12-25-2024"
```

### **Time Format**
- Date: `MM/DD/YYYY` (e.g., "12/25/2024")
- Time: `HH:MM AM/PM` (e.g., "09:00 AM")

### **Total Hours Calculation**
```
IF checkOut exists:
  totalHours = (checkOut - checkIn) - breakDuration
  
  WHERE breakDuration = (breakOut - breakIn) IF both exist
  ELSE breakDuration = 0
```

### **Business Logic**
| Scenario | Behavior |
|----------|----------|
| First action of day | Creates new attendance record |
| Subsequent actions | Updates existing record |
| Check-out recorded | Automatically calculates `totalHours` |
| Break recorded | Subtracts break time from total hours |
| Multiple check-ins | Last check-in overwrites previous |

### **Record Limits**
- Employee view: Last 10 records
- Admin view: Up to 100 records
- Sorted by: Date (newest first), then `updatedAt`

---

## 🏖️ Leave Management Rules

### **Leave Request Status**
```
Pending → Approved (by admin)
Pending → Rejected (by admin)
```

### **Required Fields**
- `leaveType` (e.g., "Sick Leave", "Vacation")
- `fromDate` (ISO date string)
- `toDate` (ISO date string)
- `reason` (text)

### **Default Status**
- `'Pending'` on creation

### **Status Transitions**
| Current Status | Allowed Transitions |
|----------------|---------------------|
| `Pending` | `Approved`, `Rejected` |
| `Approved` | None (final state) |
| `Rejected` | None (final state) |

### **Access Rules**
| Action | Employee | Admin |
|--------|----------|-------|
| Create request | ✅ (own only) | ✅ |
| View own requests | ✅ | ✅ |
| View all requests | ❌ | ✅ |
| Approve/Reject | ❌ | ✅ |

### **Missing Validations** ⚠️
- No date range validation
- No overlapping leave check
- No leave balance tracking
- No leave type limits

---

## 📊 Data Validation Rules

### **Employee**
| Field | Validation |
|-------|------------|
| `email` | Must be unique, case-insensitive |
| `role` | Must be `'admin'` or `'employee'` |
| `password` | Required (no complexity rules) |

### **Attendance**
| Field | Validation |
|-------|------------|
| `action` | Must be: `checkIn`, `checkOut`, `breakIn`, `breakOut` |
| `date` | Auto-generated (current date) |
| `time` | Auto-generated (current time) |

### **Leave Request**
| Field | Validation |
|-------|------------|
| `leaveType` | Required (no predefined list) |
| `fromDate` | Required (no format validation) |
| `toDate` | Required (no format validation) |
| `reason` | Required (no length limit) |
| `status` | Must be: `Pending`, `Approved`, `Rejected` |

---

## 🔒 Security Rules

### **Current Implementation**
| Feature | Status | Notes |
|---------|--------|-------|
| Password Hashing | ❌ | Stored in plain text |
| Token Verification | ✅ | Firebase ID token |
| IP Whitelisting | ⚠️ | Optional for Hikvision |
| CORS | ⚠️ | Allows all origins |
| Rate Limiting | ❌ | Not implemented |
| Input Sanitization | ⚠️ | Basic validation only |

### **Recommendations**
1. ✅ Hash passwords with bcryptjs
2. ✅ Configure CORS whitelist
3. ✅ Add rate limiting
4. ✅ Add input sanitization
5. ✅ Enable IP whitelist for Hikvision in production

---

## 📈 Calculation Rules

### **Total Working Hours**
```javascript
IF checkIn AND checkOut exist:
  baseHours = checkOut - checkIn
  
  IF breakIn AND breakOut exist:
    breakDuration = breakOut - breakIn
    totalHours = baseHours - breakDuration
  ELSE:
    totalHours = baseHours
  
  Format: "{hours}h {minutes}m"
```

### **Break Duration**
```javascript
IF breakIn AND breakOut exist:
  breakDuration = breakOut - breakIn
  Format: "{hours}h {minutes}m"
```

### **Attendance Summary**
```javascript
totalEmployees = count(records for date)
presentEmployees = count(records with checkIn)
averageHours = sum(totalHours) / totalEmployees
```

---

## 🎯 Access Control Matrix

| Endpoint | Employee | Admin |
|----------|----------|-------|
| `POST /api/auth/login` | ✅ | ✅ |
| `GET /api/auth/profile` | ✅ | ✅ |
| `PUT /api/auth/profile` | ✅ | ✅ |
| `GET /api/attendance/my-records` | ✅ | ✅ |
| `POST /api/attendance/record` | ✅ | ✅ |
| `GET /api/attendance/today` | ✅ | ✅ |
| `GET /api/admin/all` | ❌ | ✅ |
| `GET /api/admin/summary` | ❌ | ✅ |
| `GET /api/admin/employees` | ❌ | ✅ |
| `POST /api/admin/employees` | ❌ | ✅ |
| `PUT /api/admin/employees/:id` | ❌ | ✅ |
| `DELETE /api/admin/employees/:id` | ❌ | ✅ |
| `POST /api/leave/apply` | ✅ | ✅ |
| `GET /api/leave/my-requests` | ✅ | ✅ |
| `GET /api/leave/all` | ❌ | ✅ |
| `PUT /api/leave/:id/status` | ❌ | ✅ |

---

## 🔄 State Transitions

### **Attendance Record States**
```
[No Record]
    ↓ (checkIn)
[checkIn only]
    ↓ (checkOut)
[checkIn + checkOut + totalHours]
    ↓ (breakIn)
[checkIn + checkOut + breakIn + totalHours]
    ↓ (breakOut)
[checkIn + checkOut + breakIn + breakOut + totalHours + breakDuration]
```

### **Leave Request States**
```
[Created]
    ↓ (status: 'Pending')
[Pending]
    ↓ (admin: Approve)
[Approved] (final)
    OR
    ↓ (admin: Reject)
[Rejected] (final)
```

---

## 📝 Quick Reference: Date/Time Formats

| Context | Format | Example |
|---------|--------|---------|
| Attendance Date | `MM/DD/YYYY` | `12/25/2024` |
| Attendance Time | `HH:MM AM/PM` | `09:00 AM` |
| Document ID Date | `MM-DD-YYYY` | `12-25-2024` |
| ISO Timestamp | ISO 8601 | `2024-12-25T09:00:00.000Z` |
| Leave Dates | ISO or `YYYY-MM-DD` | `2024-12-25` |

---

## 🚨 Important Notes

1. **One Record Per Day**: Each employee has exactly one attendance record per day
2. **Document ID Strategy**: Uses `{employeeId}_{date}` for easy querying
3. **Soft Delete**: Employees are never physically deleted
4. **Real-time Updates**: Frontend uses Firebase listeners for live updates
5. **Break Time**: Only deducted if both break-in and break-out are recorded
6. **No Validation**: Leave requests don't validate date ranges or overlaps
7. **Plain Text Passwords**: ⚠️ Security risk - needs hashing

---

## 📞 Support Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Server health check |